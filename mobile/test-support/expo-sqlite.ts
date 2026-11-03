/**
 * Jest stand-in for expo-sqlite backed by Node's built-in SQLite, so tests run
 * the app's real migrations and SQL (not a hand-written mock).
 * Wired in via jest.config.js moduleNameMapper.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
/* eslint-enable @typescript-eslint/no-require-imports */

// Real files, one connection per open: per-connection PRAGMAs behave like on a phone.
// One dir per test file (stable across jest.isolateModules "app restarts"), so files
// running in one process (--runInBand) never share or lock each other's DB.
const testFile: string = (globalThis as { expect?: { getState(): { testPath?: string } } }).expect?.getState().testPath ?? 'x';
const dir: string = path.join(os.tmpdir(), `lifos-test-${process.pid}-${path.basename(testFile)}`);
fs.mkdirSync(dir, { recursive: true });
const fileFor = (name: string) => path.join(dir, name);

type Param = string | number | null | boolean | undefined;
type NodeDb = {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...p: unknown[]): { lastInsertRowid: number | bigint; changes: number | bigint };
    all(...p: unknown[]): object[];
    get(...p: unknown[]): object | undefined;
  };
  close(): void;
};

function bind(params: Param[]): (string | number | null)[] {
  return params.map((p) => {
    if (p === undefined) throw new Error('undefined bound as SQL parameter (use null)');
    return typeof p === 'boolean' ? Number(p) : p;
  });
}

const plain = <T>(row: object | undefined) => (row ? ({ ...row } as T) : null);

class Database {
  private closed = false;
  constructor(private db: NodeDb) {}

  private live(): NodeDb {
    if (this.closed) throw new Error('Database is closed');
    return this.db;
  }

  async execAsync(sql: string) {
    this.live().exec(sql);
  }

  async runAsync(sql: string, ...params: Param[]) {
    const r = this.live().prepare(sql).run(...bind(params));
    return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
  }

  async getAllAsync<T>(sql: string, ...params: Param[]): Promise<T[]> {
    return this.live()
      .prepare(sql)
      .all(...bind(params))
      .map((r) => plain<T>(r)!);
  }

  async getFirstAsync<T>(sql: string, ...params: Param[]): Promise<T | null> {
    return plain<T>(this.live().prepare(sql).get(...bind(params)));
  }

  async withTransactionAsync(task: () => Promise<void>) {
    this.live().exec('BEGIN');
    try {
      await task();
      this.live().exec('COMMIT');
    } catch (e) {
      this.live().exec('ROLLBACK');
      throw e;
    }
  }

  async closeAsync() {
    if (!this.closed) this.db.close();
    this.closed = true;
  }
}

export async function openDatabaseAsync(name: string) {
  // node:sqlite enables FKs by default; real SQLite / expo-sqlite don't. Match the device.
  return new Database(new DatabaseSync(fileFor(name), { enableForeignKeyConstraints: false }));
}

export async function deleteDatabaseAsync(name: string) {
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(fileFor(name) + suffix, { force: true });
}

export type SQLiteDatabase = Database;
