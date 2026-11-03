import CryptoJS from 'crypto-js';
import { gcm } from '@noble/ciphers/aes';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 as sha256Hash } from '@noble/hashes/sha256';

import { keyValueStore } from '@/services/key-value-store';

/**
 * Passcode -> PBKDF2-SHA256 (salted) -> 256-bit AES-GCM key.
 *
 * The key lives in memory only while unlocked. Secure storage holds just the
 * salt and a verifier (SHA-256 of the key), so reading the keychain alone
 * can't decrypt anything without the passcode.
 *
 * Older installs are migrated transparently on unlock:
 *  - v2: stored the derived key itself (AUTH_HASH / KEY_STORE). Same key, so
 *        only the stored secrets are swapped for a verifier.
 *  - v1: key = SHA-256(passcode), AES-CBC. Data is re-encrypted.
 */
/** Single value "<salt hex>:<verifier hex>" so the pair is written atomically. */
const AUTH = 'lifos.auth.v3';
const V2_SALT = 'lifos.auth.salt';
const V2_HASH = 'lifos.auth.hash';
const V2_KEY = 'lifos.key.v2';
const V1_KEY = 'lifos.key';
const V1_VERIFIER = 'lifos.verifier';

const PBKDF2_ITERATIONS = 100_000;
const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

/** Re-encrypts every encrypted record from one key to another. Must be atomic. */
export type Reencryptor = (oldKeyHex: string, newKeyHex: string) => Promise<void>;

const sha256 = (s: string) => CryptoJS.SHA256(s).toString(CryptoJS.enc.Hex);

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) throw new Error('Invalid hexadecimal key or nonce.');
  return Uint8Array.from(hex.match(/../g)!, (h) => parseInt(h, 16));
}

const bytesToBase64 = (bytes: Uint8Array) => CryptoJS.enc.Hex.parse(bytesToHex(bytes)).toString(CryptoJS.enc.Base64);
const base64ToBytes = (b64: string) => hexToBytes(CryptoJS.enc.Base64.parse(b64).toString(CryptoJS.enc.Hex));

/** Needs global crypto.getRandomValues (polyfilled on native by services/crypto-polyfill). */
function randomBytes(n: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * PBKDF2-HMAC-SHA256 via @noble/hashes: byte-identical to the previous CryptoJS
 * output (UTF-8 password, hex salt), but several times faster on Hermes, so
 * existing verifiers keep working with no migration.
 */
export function deriveKey(password: string, saltHex: string): string {
  return bytesToHex(
    pbkdf2(sha256Hash, new TextEncoder().encode(password), hexToBytes(saltHex), {
      c: PBKDF2_ITERATIONS,
      dkLen: KEY_BYTES,
    }),
  );
}

/** Domain-separated so the verifier can never be used as the key. */
const verifierFor = (keyHex: string) => sha256(`lifos-verifier:${keyHex}`);

/** Format: v2:<iv hex>:<tag hex>:<ciphertext base64> */
export function encryptWithKey(plaintext: string, keyHex: string): string {
  const iv = randomBytes(NONCE_BYTES);
  const sealed = gcm(hexToBytes(keyHex), iv).encrypt(new TextEncoder().encode(plaintext));
  const ct = sealed.slice(0, -TAG_BYTES);
  const tag = sealed.slice(-TAG_BYTES);
  return `v2:${bytesToHex(iv)}:${bytesToHex(tag)}:${bytesToBase64(ct)}`;
}

export function decryptWithKey(payload: string, keyHex: string): string {
  const parts = payload.split(':');
  if (parts[0] !== 'v2') return decryptV1(payload, keyHex);
  const [, iv, tag, ct] = parts;
  if (iv?.length !== NONCE_BYTES * 2 || tag?.length !== TAG_BYTES * 2 || !ct) {
    throw new Error('Malformed encrypted payload.');
  }
  try {
    const sealed = new Uint8Array([...base64ToBytes(ct), ...hexToBytes(tag)]);
    return new TextDecoder().decode(gcm(hexToBytes(keyHex), hexToBytes(iv)).decrypt(sealed));
  } catch {
    throw new Error('Encrypted data failed authentication and may have been tampered with.');
  }
}

/** v1 format: <iv hex>:<AES-CBC ciphertext base64>. Read-only, for migration. */
function decryptV1(payload: string, keyHex: string): string {
  const [ivHex, ctB64] = payload.split(':');
  if (!ivHex || !ctB64) throw new Error('Malformed encrypted payload.');
  const plaintext = CryptoJS.AES.decrypt(
    CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(ctB64) }),
    CryptoJS.enc.Hex.parse(keyHex),
    { iv: CryptoJS.enc.Hex.parse(ivHex) },
  ).toString(CryptoJS.enc.Utf8);
  if (!plaintext) throw new Error('Legacy encrypted data could not be decrypted.');
  return plaintext;
}

const LEGACY_KEYS = [V2_SALT, V2_HASH, V2_KEY, V1_KEY, V1_VERIFIER];

async function saveSecrets(saltHex: string, keyHex: string): Promise<void> {
  await keyValueStore.setItem(AUTH, `${saltHex}:${verifierFor(keyHex)}`);
  await Promise.all(LEGACY_KEYS.map((k) => keyValueStore.removeItem(k)));
}

const get = (keys: string[]) => Promise.all(keys.map((k) => keyValueStore.getItem(k)));

/** New "<salt>:<verifier>" written before a passcode change re-encrypts, removed after. */
const PENDING = 'lifos.auth.pending';

/** True if the key decrypts existing data (or there is none). */
export type KeyProbe = (keyHex: string) => Promise<boolean>;

/** Derived key if `password` matches a "<salt>:<verifier>" entry, else null. */
function keyFor(entry: string, password: string): string | null {
  const [salt, verifier] = entry.split(':');
  if (!salt) return null;
  const key = deriveKey(password, salt);
  return constantTimeEqual(verifierFor(key), verifier ?? '') ? key : null;
}

class EncryptionService {
  private key: string | null = null;

  isUnlocked(): boolean {
    return this.key != null;
  }

  async isInitialized(): Promise<boolean> {
    const [auth, v2Salt, v2Hash, v1] = await get([AUTH, V2_SALT, V2_HASH, V1_VERIFIER]);
    return Boolean(auth || (v2Salt && v2Hash) || v1);
  }

  async setup(password: string): Promise<void> {
    const salt = bytesToHex(randomBytes(16));
    const key = deriveKey(password, salt);
    await saveSecrets(salt, key);
    this.key = key;
  }

  /**
   * `reencrypt` is only used when migrating v1 data. `probe` lets unlock finish
   * (or roll back) a passcode change the app died in the middle of.
   */
  async unlock(password: string, reencrypt?: Reencryptor, probe?: KeyProbe): Promise<boolean> {
    const [auth, pending, v2Salt, v2Hash, v1Key, v1Verifier] = await get([
      AUTH, PENDING, V2_SALT, V2_HASH, V1_KEY, V1_VERIFIER,
    ]);

    if (auth) {
      const key = keyFor(auth, password);
      if (key) {
        if (pending && probe) {
          if (!(await probe(key))) {
            throw new Error('A passcode change was interrupted after your data was re-encrypted. Unlock with the new passcode.');
          }
          await keyValueStore.removeItem(PENDING); // change never committed: discard it
        }
        this.key = key;
        return true;
      }
      // New passcode from an interrupted change: promote it only if the data is really under it.
      const pendingKey = pending ? keyFor(pending, password) : null;
      if (!pendingKey || !probe || !(await probe(pendingKey))) return false;
      await keyValueStore.setItem(AUTH, pending!);
      await keyValueStore.removeItem(PENDING);
      this.key = pendingKey;
      return true;
    }

    if (v2Salt && v2Hash) {
      const key = deriveKey(password, v2Salt);
      if (!constantTimeEqual(key, v2Hash)) return false;
      await saveSecrets(v2Salt, key); // same key: data untouched
      this.key = key;
      return true;
    }

    if (!v1Key || !v1Verifier) return false;
    if (!constantTimeEqual(sha256(sha256(password)), v1Verifier)) return false;
    // Without re-encryption the v1 data would become unreadable under the new key.
    if (!reencrypt) throw new Error('Legacy data needs re-encryption to unlock.');
    const newSalt = bytesToHex(randomBytes(16));
    const newKey = deriveKey(password, newSalt);
    await reencrypt(v1Key, newKey);
    await saveSecrets(newSalt, newKey);
    this.key = newKey;
    return true;
  }

  lock(): void {
    this.key = null;
  }

  async reset(): Promise<void> {
    this.key = null;
    await Promise.all([AUTH, PENDING, ...LEGACY_KEYS].map((k) => keyValueStore.removeItem(k)));
  }

  /**
   * Writes the new verifier as PENDING, re-encrypts (transactional), then
   * promotes it. If the app dies in between, `unlock` with `probe` works out
   * which passcode the data is under and completes or discards the change.
   */
  async changePassword(current: string, next: string, reencrypt: Reencryptor, probe?: KeyProbe): Promise<boolean> {
    if (!(await this.unlock(current, reencrypt, probe)) || !this.key) return false;
    const salt = bytesToHex(randomBytes(16));
    const newKey = deriveKey(next, salt);
    const entry = `${salt}:${verifierFor(newKey)}`;
    await keyValueStore.setItem(PENDING, entry);
    try {
      await reencrypt(this.key, newKey);
    } catch (e) {
      await keyValueStore.removeItem(PENDING); // rolled back: old passcode still valid
      throw e;
    }
    await keyValueStore.setItem(AUTH, entry);
    await keyValueStore.removeItem(PENDING);
    this.key = newKey;
    return true;
  }

  encrypt(plaintext: string): string {
    if (!this.key) throw new Error('App is locked. Unlock before writing data.');
    return encryptWithKey(plaintext, this.key);
  }

  decrypt(payload: string): string {
    if (!this.key) throw new Error('App is locked.');
    return decryptWithKey(payload, this.key);
  }
}

export const encryptionService = new EncryptionService();
