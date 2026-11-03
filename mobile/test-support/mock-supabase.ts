/**
 * Minimal in-memory Supabase: just the calls sync-manager makes.
 * Usage (jest.mock factories can't close over imports, so require inside):
 *   jest.mock('@/services/supabase', () => require('../test-support/mock-supabase').supabaseModule);
 *   import { mockRemote } from '../test-support/mock-supabase';
 */
type Row = Record<string, unknown>;

export const mockRemote = {
  tables: {} as Record<string, Row[]>,
  user: { id: 'user-1' } as { id: string } | null,
  failNextInsert: false,
  reset() {
    this.tables = {};
    this.user = { id: 'user-1' };
    this.failNextInsert = false;
  },
  rows(name: string): Row[] {
    return this.tables[name] ?? [];
  },
};

const table = (name: string) => (mockRemote.tables[name] ??= []);
const ok = { error: null };

const client = {
  auth: { getUser: async () => ({ data: { user: mockRemote.user }, error: null }) },
  from: (name: string) => ({
    upsert: async (row: Row, { onConflict }: { onConflict: string }) => {
      const keys = onConflict.split(',');
      const rows = table(name);
      const i = rows.findIndex((r) => keys.every((k) => r[k] === row[k]));
      if (i >= 0) rows[i] = row;
      else rows.push(row);
      return ok;
    },
    insert: async (rows: Row[]) => {
      if (mockRemote.failNextInsert) {
        mockRemote.failNextInsert = false;
        return { error: { message: 'network down' } };
      }
      table(name).push(...rows);
      return ok;
    },
    delete: () => {
      const filters: [string, unknown][] = [];
      const q = {
        eq: (k: string, v: unknown) => {
          filters.push([k, v]);
          return q;
        },
        then: (resolve: (r: typeof ok) => void) => {
          mockRemote.tables[name] = table(name).filter((r) => !filters.every(([k, v]) => r[k] === v));
          resolve(ok);
        },
      };
      return q;
    },
  }),
};

export const supabaseModule = { getSupabase: () => client, isSupabaseConfigured: () => true };
