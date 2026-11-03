import CryptoJS from 'crypto-js';
import { store } from '../test-support/expo-secure-store';
import { resetDatabase } from '@/services/database';
import { all, run } from '@/services/db';
import { decryptWithKey, deriveKey, encryptionService, encryptWithKey } from '@/services/encryption';
import { addBloodTest, canDecryptWith, listBloodTests, reencryptAll } from '@/services/blood-test-service';
import { lockoutDelayMs, useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';

const PW = 'correct horse';
const KEY = 'ab'.repeat(32);

beforeEach(async () => {
  store.clear();
  encryptionService.lock();
  await resetDatabase();
});

describe('AES-GCM payloads', () => {
  it('round-trips unicode with a fresh nonce each time', () => {
    const a = encryptWithKey('héllo 🧪', KEY);
    const b = encryptWithKey('héllo 🧪', KEY);
    expect(a).toMatch(/^v2:[0-9a-f]{24}:[0-9a-f]{32}:/);
    expect(a).not.toBe(b);
    expect(decryptWithKey(a, KEY)).toBe('héllo 🧪');
  });

  it('rejects tampering and the wrong key', () => {
    const enc = encryptWithKey('120', KEY);
    const [v, iv, tag, ct] = enc.split(':');
    const flipped = `${v}:${iv}:${tag}:${ct.startsWith('A') ? 'B' : 'A'}${ct.slice(1)}`;
    expect(() => decryptWithKey(flipped, KEY)).toThrow(/tampered/);
    expect(() => decryptWithKey(enc, 'cd'.repeat(32))).toThrow(/tampered/);
    expect(() => decryptWithKey('v2:zz:yy:xx', KEY)).toThrow(/Malformed/);
  });
});

describe('key derivation', () => {
  it('matches the previous CryptoJS PBKDF2 byte-for-byte, so existing passcodes still unlock', () => {
    for (const pw of ['correct horse', 'пароль-🔐', '123456']) {
      const salt = 'a1'.repeat(16);
      const legacy = CryptoJS.PBKDF2(pw, CryptoJS.enc.Hex.parse(salt), {
        keySize: 8,
        iterations: 100_000,
        hasher: CryptoJS.algo.SHA256,
      }).toString(CryptoJS.enc.Hex);
      expect(deriveKey(pw, salt)).toBe(legacy);
    }
  });
});

describe('passcode', () => {
  it('setup + unlock; wrong passcode refused', async () => {
    expect(await encryptionService.isInitialized()).toBe(false);
    await encryptionService.setup(PW);
    expect(await encryptionService.isInitialized()).toBe(true);
    encryptionService.lock();
    expect(await encryptionService.unlock('nope')).toBe(false);
    expect(encryptionService.isUnlocked()).toBe(false);
    expect(await encryptionService.unlock(PW)).toBe(true);
  });

  it('never stores the encryption key in secure storage (regression: key was stored as the "hash")', async () => {
    await encryptionService.setup(PW);
    const [salt] = store.get('lifos.auth.v3')!.split(':');
    const key = deriveKey(PW, salt);
    expect([...store.values()].some((v) => v.includes(key))).toBe(false);
    expect([...store.keys()]).toEqual(['lifos.auth.v3']);
  });

  it('refuses to encrypt while locked', async () => {
    expect(() => encryptionService.encrypt('x')).toThrow(/locked/);
  });
});

describe('migration from older installs', () => {
  it('v2 (stored derived key): unlocks, drops the stored key, data untouched', async () => {
    const salt = '00'.repeat(16);
    const key = deriveKey(PW, salt);
    store.set('lifos.auth.salt', salt);
    store.set('lifos.auth.hash', key);
    store.set('lifos.key.v2', key);
    await run(
      `INSERT INTO blood_tests (date, test_type, value_enc, unit) VALUES ('2026-01-01', 'TSH', ?, 'mIU/L')`,
      encryptWithKey('2.5', key),
    );

    expect(await encryptionService.isInitialized()).toBe(true);
    expect(await encryptionService.unlock('wrong')).toBe(false);
    expect(await encryptionService.unlock(PW)).toBe(true);
    expect([...store.keys()]).toEqual(['lifos.auth.v3']);
    expect((await listBloodTests())[0].value).toBe(2.5);

    encryptionService.lock();
    expect(await encryptionService.unlock(PW)).toBe(true); // new format works next launch
  });

  it('v1 (SHA-256 key, AES-CBC): unlocks via the store and re-encrypts data to v2', async () => {
    const v1Key = CryptoJS.SHA256(PW).toString(CryptoJS.enc.Hex);
    store.set('lifos.key', v1Key);
    store.set('lifos.verifier', CryptoJS.SHA256(v1Key).toString(CryptoJS.enc.Hex));
    const iv = CryptoJS.lib.WordArray.random(16);
    const ct = CryptoJS.AES.encrypt('5.4', CryptoJS.enc.Hex.parse(v1Key), { iv }).ciphertext.toString(CryptoJS.enc.Base64);
    await run(
      `INSERT INTO blood_tests (date, test_type, value_enc, unit) VALUES ('2026-01-01', 'HbA1c', ?, '%')`,
      `${iv.toString(CryptoJS.enc.Hex)}:${ct}`,
    );

    await useAuthStore.getState().init();
    expect(useAuthStore.getState().status).toBe('locked');
    expect(await useAuthStore.getState().unlock(PW)).toBe(true);
    expect((await listBloodTests())[0].value).toBe(5.4);
    const [row] = await all<{ value_enc: string }>('SELECT value_enc FROM blood_tests');
    expect(row.value_enc.startsWith('v2:')).toBe(true);
    expect([...store.keys()]).toEqual(['lifos.auth.v3']);
  });
});

describe('change passcode', () => {
  it('re-encrypts every record; old passcode stops working', async () => {
    await encryptionService.setup(PW);
    await addBloodTest({ date: '2026-01-01', testType: 'LDL', unit: 'mg/dL', value: 130, notes: 'fasting' });
    expect(await encryptionService.changePassword(PW, 'new-pass', reencryptAll)).toBe(true);
    encryptionService.lock();
    expect(await encryptionService.unlock(PW)).toBe(false);
    expect(await encryptionService.unlock('new-pass')).toBe(true);
    expect(await listBloodTests()).toMatchObject([{ value: 130, notes: 'fasting' }]);
  });

  it('wrong current passcode changes nothing', async () => {
    await encryptionService.setup(PW);
    expect(await encryptionService.changePassword('bad', 'new-pass', reencryptAll)).toBe(false);
    encryptionService.lock();
    expect(await encryptionService.unlock(PW)).toBe(true);
  });

  it('a failure mid re-encryption rolls back and keeps the old passcode working', async () => {
    await encryptionService.setup(PW);
    await addBloodTest({ date: '2026-01-01', testType: 'LDL', unit: 'mg/dL', value: 130 });
    await run(`INSERT INTO blood_tests (date, test_type, value_enc, unit) VALUES ('2026-01-02', 'X', 'garbage', '')`);
    await expect(encryptionService.changePassword(PW, 'new-pass', reencryptAll)).rejects.toThrow();
    await run(`DELETE FROM blood_tests WHERE value_enc = 'garbage'`);
    encryptionService.lock();
    expect(await encryptionService.unlock(PW)).toBe(true);
    expect((await listBloodTests())[0].value).toBe(130);
  });

  it('finishes a passcode change the app died in after re-encrypting', async () => {
    await encryptionService.setup(PW);
    await addBloodTest({ date: '2026-01-01', testType: 'LDL', unit: 'mg/dL', value: 130 });
    const oldAuth = store.get('lifos.auth.v3')!;
    expect(await encryptionService.changePassword(PW, 'new-pass', reencryptAll, canDecryptWith)).toBe(true);
    // Simulate dying before promotion: data under the new key, old verifier still main.
    store.set('lifos.auth.pending', store.get('lifos.auth.v3')!);
    store.set('lifos.auth.v3', oldAuth);
    encryptionService.lock();

    await expect(encryptionService.unlock(PW, undefined, canDecryptWith)).rejects.toThrow(/interrupted/);
    expect(await encryptionService.unlock('new-pass', undefined, canDecryptWith)).toBe(true);
    expect(store.has('lifos.auth.pending')).toBe(false);
    expect((await listBloodTests())[0].value).toBe(130);
    encryptionService.lock();
    expect(await encryptionService.unlock('new-pass')).toBe(true); // promoted for next launch
  });

  it('discards a passcode change the app died in before re-encryption committed', async () => {
    await encryptionService.setup(PW);
    await addBloodTest({ date: '2026-01-01', testType: 'LDL', unit: 'mg/dL', value: 130 });
    let pending: string | undefined;
    const crash = async () => {
      pending = store.get('lifos.auth.pending');
      throw new Error('killed');
    };
    await expect(encryptionService.changePassword(PW, 'new-pass', crash, canDecryptWith)).rejects.toThrow('killed');
    store.set('lifos.auth.pending', pending!); // a real crash never reaches the cleanup
    encryptionService.lock();

    expect(await encryptionService.unlock('new-pass', undefined, canDecryptWith)).toBe(false);
    expect(await encryptionService.unlock(PW, undefined, canDecryptWith)).toBe(true);
    expect(store.has('lifos.auth.pending')).toBe(false);
    expect((await listBloodTests())[0].value).toBe(130);
  });
});

describe('auth store', () => {
  it('lock clears decrypted data from memory', async () => {
    await useAuthStore.getState().setup(PW);
    await addBloodTest({ date: '2026-01-01', testType: 'LDL', unit: 'mg/dL', value: 99 });
    await useDataStore.getState().reloadBloodTests();
    expect(useDataStore.getState().bloodTests).toHaveLength(1);
    await useAuthStore.getState().lock();
    expect(useDataStore.getState().bloodTests).toEqual([]);
  });

  it('resetAll wipes data and passcode', async () => {
    await useAuthStore.getState().setup(PW);
    await addBloodTest({ date: '2026-01-01', testType: 'LDL', unit: 'mg/dL', value: 99 });
    await useAuthStore.getState().resetAll();
    expect(useAuthStore.getState().status).toBe('uninitialized');
    expect(await encryptionService.isInitialized()).toBe(false);
    expect(await all('SELECT * FROM blood_tests')).toEqual([]);
  });
});

describe('unlock backoff', () => {
  it('delay grows after 5 failures and is capped at 5 minutes', () => {
    expect([1, 4, 5, 6, 7, 20].map(lockoutDelayMs)).toEqual([0, 0, 30_000, 60_000, 120_000, 300_000]);
  });

  it('refuses unlock while locked out, even with the right passcode, and persists across restarts', async () => {
    await useAuthStore.getState().setup(PW);
    await useAuthStore.getState().lock();
    for (let i = 0; i < 5; i++) expect(await useAuthStore.getState().unlock('wrong')).toBe(false);
    expect(await useAuthStore.getState().unlock(PW)).toBe(false);
    expect(useAuthStore.getState().error).toMatch(/Too many attempts/);
    expect(JSON.parse(store.get('lifos.auth.attempts')!).count).toBe(5);
    // Lockout expires -> right passcode works and the counter resets.
    store.set('lifos.auth.attempts', JSON.stringify({ count: 5, until: Date.now() - 1 }));
    expect(await useAuthStore.getState().unlock(PW)).toBe(true);
    expect(store.has('lifos.auth.attempts')).toBe(false);
  });
});
