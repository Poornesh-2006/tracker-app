import { store } from '../test-support/expo-secure-store';
import { resetDatabase } from '@/services/database';
import { all } from '@/services/db';
import { encryptionService } from '@/services/encryption';
import { addBloodTest } from '@/services/blood-test-service';
import { addTodo } from '@/services/todo-service';
import { addTransaction } from '@/services/finance-service';
import { buildExport, EXPORT_TABLES } from '@/services/export';

beforeEach(async () => {
  store.clear();
  await resetDatabase();
  await encryptionService.setup('pass-123');
});

describe('export', () => {
  it('includes every user table, not just health (regression: only 4 tables were exported)', async () => {
    const tables = (await all<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table'`)).map((t) => t.name);
    const internal = ['sqlite_sequence', 'sync_queue', 'rewards_shop', 'travel_live', 'blood_tests'];
    expect([...EXPORT_TABLES].sort()).toEqual(tables.filter((t) => !internal.includes(t)).sort());
  });

  it('contains decrypted blood tests and other data', async () => {
    await addBloodTest({ date: '2026-01-01', testType: 'LDL', unit: 'mg/dL', value: 130, notes: 'n' });
    await addTodo('call doctor');
    await addTransaction({ type: 'expense', category: 'health', amount: 40, date: '2026-01-01' });
    const out = (await buildExport()) as { bloodTests: unknown[]; tables: Record<string, Record<string, unknown>[]> };
    expect(out.bloodTests).toMatchObject([{ testType: 'LDL', unit: 'mg/dL', value: 130, notes: 'n' }]);
    expect(out.tables.todos).toMatchObject([{ title: 'call doctor' }]);
    expect(out.tables.finance_transactions).toMatchObject([{ amount: 40 }]);
    expect(JSON.stringify(out)).not.toContain('value_enc');
  });
});
