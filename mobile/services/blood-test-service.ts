import { all, deleteById, insert, run, transaction } from './db';
import { decryptWithKey, encryptionService, encryptWithKey } from './encryption';
import type { BloodTest, BloodTestInput } from '@/types';

/** Value and notes are encrypted at rest; everything else is plain for querying. */
interface Row {
  id: number;
  date: string;
  test_type: string;
  value_enc: string;
  unit: string;
  notes_enc: string | null;
  photo_uri: string | null;
  source: string;
  created_at: string;
}

function toBloodTest(row: Row): BloodTest {
  return {
    id: row.id,
    date: row.date,
    testType: row.test_type,
    value: Number(encryptionService.decrypt(row.value_enc)),
    unit: row.unit,
    notes: row.notes_enc ? encryptionService.decrypt(row.notes_enc) : null,
    photoUri: row.photo_uri,
    source: row.source as BloodTest['source'],
    createdAt: row.created_at,
  };
}

const params = (i: BloodTestInput) =>
  [
    i.date,
    i.testType,
    encryptionService.encrypt(String(i.value)),
    i.unit ?? '',
    i.notes ? encryptionService.encrypt(i.notes) : null,
    i.photoUri ?? null,
    i.source ?? 'manual',
  ] as const;

export function addBloodTest(input: BloodTestInput): Promise<number> {
  return insert(
    `INSERT INTO blood_tests (date, test_type, value_enc, unit, notes_enc, photo_uri, source) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ...params(input),
  );
}

export async function listBloodTests(limit = 200): Promise<BloodTest[]> {
  const rows = await all<Row>(`SELECT * FROM blood_tests ORDER BY date DESC, id DESC LIMIT ?`, limit);
  return rows.map(toBloodTest);
}

export async function listBloodTestsByType(testType: string, limit = 100): Promise<BloodTest[]> {
  const rows = await all<Row>(`SELECT * FROM blood_tests WHERE test_type = ? ORDER BY date ASC LIMIT ?`, testType, limit);
  return rows.map(toBloodTest);
}

export async function updateBloodTest(id: number, input: BloodTestInput): Promise<void> {
  await run(
    `UPDATE blood_tests SET date = ?, test_type = ?, value_enc = ?, unit = ?, notes_enc = ?, photo_uri = ?, source = ?
     WHERE id = ?`,
    ...params(input),
    id,
  );
}

export const deleteBloodTest = (id: number) => deleteById('blood_tests', id);

/** True if `keyHex` decrypts the stored data (or there is none). Used to recover an interrupted passcode change. */
export async function canDecryptWith(keyHex: string): Promise<boolean> {
  const [row] = await all<{ value_enc: string }>(`SELECT value_enc FROM blood_tests LIMIT 1`);
  if (!row) return true;
  try {
    decryptWithKey(row.value_enc, keyHex);
    return true;
  } catch {
    return false;
  }
}

/** All rows or none: a failure mid-way rolls back, so data is never split across two keys. */
export async function reencryptAll(oldKeyHex: string, newKeyHex: string): Promise<void> {
  const swap = (enc: string) => encryptWithKey(decryptWithKey(enc, oldKeyHex), newKeyHex);
  await transaction(async () => {
    const rows = await all<Row>(`SELECT id, value_enc, notes_enc FROM blood_tests`);
    for (const row of rows) {
      await run(
        `UPDATE blood_tests SET value_enc = ?, notes_enc = ? WHERE id = ?`,
        swap(row.value_enc),
        row.notes_enc ? swap(row.notes_enc) : null,
        row.id,
      );
    }
  });
}
