/**
 * Web-only database implementation.
 *
 * Metro resolves `./database` to this file when bundling for web, so the
 * desktop preview never loads expo-sqlite's WASM worker (wa-sqlite), which
 * cannot run inside the Metro web bundle.
 *
 * It implements the small SQL surface the app uses on top of in-memory
 * tables. Data lives for the browser session only — this is a preview
 * stand-in, not a replacement for the native SQLite store.
 */

type Row = Record<string, any>;

const databases = new Map<string, Map<string, Row[]>>();

function database(name: string): Map<string, Row[]> {
  if (!databases.has(name)) databases.set(name, new Map());
  return databases.get(name)!;
}

function table(db: Map<string, Row[]>, name: string): Row[] {
  if (!db.has(name)) db.set(name, []);
  return db.get(name)!;
}

function literalOrParam(token: string, params: any[], cursor: { i: number }): any {
  const t = token.trim();
  if (t === '?') return params[cursor.i++];
  if (/^'.*'$/.test(t)) return t.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (t.toUpperCase() === 'NULL') return null;
  return t;
}

function compare(actual: any, op: string, expected: any): boolean {
  const a = actual === null || actual === undefined ? null : actual;
  switch (op) {
    case '=':
      return String(a) === String(expected);
    case '!=':
    case '<>':
      return String(a) !== String(expected);
    case '>':
      return Number(a) > Number(expected);
    case '<':
      return Number(a) < Number(expected);
    case '>=':
      return Number(a) >= Number(expected);
    case '<=':
      return Number(a) <= Number(expected);
    default:
      return false;
  }
}

function extractWhere(sql: string): string | null {
  const m = sql.match(/\sWHERE\s+([\s\S]+?)(?:\s+ORDER\s+BY\s|\s+GROUP\s+BY\s|\s+LIMIT\s|$)/i);
  return m ? m[1].trim() : null;
}

function buildPredicate(whereRaw: string | null, params: any[], cursor: { i: number }): (row: Row) => boolean {
  if (!whereRaw) return () => true;
  const conditions = whereRaw.split(/\s+AND\s+/i);
  const checks: Array<(row: Row) => boolean> = [];
  for (const cond of conditions) {
    const m = cond.match(/([`"]?\w+[`"]?)\s*(<=|>=|!=|<>|=|<|>)\s*(?:\?|'([^']*)'|(-?\d+(?:\.\d+)?))/);
    if (!m) continue;
    const col = m[1].replace(/[`"]/g, '');
    const op = m[2];
    let expected: any;
    if (/\?/.test(cond)) expected = params[cursor.i++];
    else if (m[3] !== undefined) expected = m[3];
    else expected = Number(m[4]);
    checks.push((row) => compare(row[col], op, expected));
  }
  return (row) => checks.every((c) => c(row));
}

function applyOrder(sql: string, rows: Row[]): Row[] {
  const m = sql.match(/ORDER\s+BY\s+([\s\S]+?)(?:\s+LIMIT\s|$)/i);
  if (!m) return rows;
  const terms = m[1].split(',').map((t) => t.trim());
  return [...rows].sort((a, b) => {
    for (const term of terms) {
      const tm = term.match(/([`"]?\w+[`"]?)\s*(ASC|DESC)?/i);
      if (!tm) continue;
      const col = tm[1].replace(/[`"]/g, '');
      const dir = (tm[2] ?? 'ASC').toUpperCase() === 'DESC' ? -1 : 1;
      const av = a[col];
      const bv = b[col];
      if (av === bv) continue;
      if (av === null || av === undefined) return 1 * dir;
      if (bv === null || bv === undefined) return -1 * dir;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    }
    return 0;
  });
}

function applyLimit(sql: string, rows: Row[]): Row[] {
  const m = sql.match(/LIMIT\s+(\d+)/i);
  return m ? rows.slice(0, Number(m[1])) : rows;
}

class WebDatabase {
  private db: Map<string, Row[]>;

  constructor(name: string) {
    this.db = database(name);
  }

  async execAsync(sql: string): Promise<void> {
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      const up = stmt.toUpperCase();
      if (up.startsWith('CREATE TABLE')) {
        const m = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?/i);
        if (m) table(this.db, m[1]);
      } else if (up.startsWith('DROP TABLE')) {
        const m = stmt.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?[`"]?(\w+)[`"]?/i);
        if (m) this.db.delete(m[1]);
      }
      // PRAGMA and CREATE INDEX are no-ops in the in-memory store.
    }
  }

  async runAsync(sql: string, ...params: any[]): Promise<{ lastInsertRowId: number; changes: number }> {
    const up = sql.trim().toUpperCase();
    if (up.startsWith('INSERT')) return this.insert(sql, params);
    if (up.startsWith('UPDATE')) return this.update(sql, params);
    if (up.startsWith('DELETE')) return this.remove(sql, params);
    return { lastInsertRowId: 0, changes: 0 };
  }

  private insert(sql: string, params: any[]): { lastInsertRowId: number; changes: number } {
    const m = sql.match(
      /INSERT\s+(?:OR\s+\w+\s+)?INTO\s+[`"]?(\w+)[`"]?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i,
    );
    if (!m) return { lastInsertRowId: 0, changes: 0 };
    const tableName = m[1];
    const cols = m[2].split(',').map((c) => c.trim().replace(/[`"]/g, ''));
    const values = m[3].split(',').map((v) => v.trim());
    const rows = table(this.db, tableName);
    const cursor = { i: 0 };
    const row: Row = {};
    values.forEach((v, i) => {
      if (i < cols.length) row[cols[i]] = literalOrParam(v, params, cursor);
    });

    if (/ON\s+CONFLICT/i.test(sql) && cols.length > 0) {
      const keyCol = cols[0];
      const idx = rows.findIndex((r) => String(r[keyCol]) === String(row[keyCol]));
      if (idx >= 0) {
        rows[idx] = { ...rows[idx], ...row };
        return { lastInsertRowId: Number(rows[idx].id) || idx + 1, changes: 1 };
      }
    }

    if (row.id === undefined) {
      row.id = rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
    }
    if (row.created_at === undefined) {
      row.created_at = new Date().toISOString();
    }
    rows.push(row);
    return { lastInsertRowId: Number(row.id), changes: 1 };
  }

  private update(sql: string, params: any[]): { lastInsertRowId: number; changes: number } {
    const m = sql.match(/UPDATE\s+[`"]?(\w+)[`"]?\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?$/i);
    if (!m) return { lastInsertRowId: 0, changes: 0 };
    const tableName = m[1];
    const setClause = m[2];
    const whereClause = m[3] ?? null;
    const rows = table(this.db, tableName);
    const cursor = { i: 0 };
    const assignments: Array<[string, any]> = setClause.split(',').map((pair) => {
      const am = pair.match(/([`"]?\w+[`"]?)\s*=\s*(?:\?|'([^']*)'|(-?\d+(?:\.\d+)?)|(\w+))/);
      if (!am) return ['', undefined];
      const col = am[1].replace(/[`"]/g, '');
      const value = pair.includes('?')
        ? params[cursor.i++]
        : am[2] !== undefined
          ? am[2]
          : am[3] !== undefined
            ? Number(am[3])
            : am[4];
      return [col, value] as [string, any];
    });
    const predicate = buildPredicate(whereClause, params, cursor);
    let changes = 0;
    for (const row of rows) {
      if (!predicate(row)) continue;
      for (const [col, value] of assignments) {
        if (col) row[col] = value;
      }
      changes++;
    }
    return { lastInsertRowId: 0, changes };
  }

  private remove(sql: string, params: any[]): { lastInsertRowId: number; changes: number } {
    const m = sql.match(/DELETE\s+FROM\s+[`"]?(\w+)[`"]?(?:\s+WHERE\s+([\s\S]+))?$/i);
    if (!m) return { lastInsertRowId: 0, changes: 0 };
    const tableName = m[1];
    const whereClause = m[2] ?? null;
    const rows = table(this.db, tableName);
    if (!whereClause) {
      const changes = rows.length;
      rows.length = 0;
      return { lastInsertRowId: 0, changes };
    }
    const cursor = { i: 0 };
    const predicate = buildPredicate(whereClause, params, cursor);
    const keep = rows.filter((row) => !predicate(row));
    const changes = rows.length - keep.length;
    rows.length = 0;
    rows.push(...keep);
    return { lastInsertRowId: 0, changes };
  }

  async getAllAsync(sql: string, ...params: any[]): Promise<any[]> {
    const statement = sql.trim();

    const sumMatch = statement.match(
      /SELECT\s+COALESCE\(\s*SUM\(([`"]?\w+[`"]?)\)\s*,\s*0\s*\)\s+AS\s+([`"]?\w+[`"]?)\s+FROM\s+[`"]?(\w+)[`"]?/i,
    );
    if (sumMatch) {
      const column = sumMatch[1].replace(/[`"]/g, '');
      const alias = sumMatch[2].replace(/[`"]/g, '');
      const tableName = sumMatch[3];
      const cursor = { i: 0 };
      const predicate = buildPredicate(extractWhere(statement), params, cursor);
      const total = table(this.db, tableName)
        .filter(predicate)
        .reduce((sum, row) => sum + (Number(row[column]) || 0), 0);
      return [{ [alias]: total }];
    }

    const countMatch = statement.match(/SELECT\s+COUNT\(\*\)\s+AS\s+([`"]?\w+[`"]?)\s+FROM\s+[`"]?(\w+)[`"]?/i);
    if (countMatch) {
      const alias = countMatch[1].replace(/[`"]/g, '');
      const tableName = countMatch[2];
      const cursor = { i: 0 };
      const predicate = buildPredicate(extractWhere(statement), params, cursor);
      return [{ [alias]: table(this.db, tableName).filter(predicate).length }];
    }

    const selectMatch = statement.match(/SELECT\s+([\s\S]+?)\s+FROM\s+[`"]?(\w+)[`"]?/i);
    if (!selectMatch) return [];
    const projection = selectMatch[1].trim();
    const tableName = selectMatch[2];

    const cursor = { i: 0 };
    const predicate = buildPredicate(extractWhere(statement), params, cursor);
    let rows = table(this.db, tableName).filter(predicate);
    rows = applyOrder(statement, rows);
    rows = applyLimit(statement, rows);

    if (/^DISTINCT\s+/i.test(projection)) {
      const col = projection.replace(/^DISTINCT\s+/i, '').trim().replace(/[`"]/g, '');
      const seen = new Set<string>();
      const out: Row[] = [];
      for (const row of rows) {
        const key = String(row[col]);
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ [col]: row[col] });
        }
      }
      return out;
    }

    if (projection === '*') return rows.map((row) => ({ ...row }));

    const columns = projection.split(',').map((c) => c.trim().replace(/[`"]/g, ''));
    return rows.map((row) => {
      const out: Row = {};
      for (const col of columns) {
        out[col] = row[col] ?? null;
      }
      return out;
    });
  }

  async getFirstAsync(sql: string, ...params: any[]): Promise<any | null> {
    const rows = await this.getAllAsync(sql, ...params);
    return rows[0] ?? null;
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  }

  async withExclusiveTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  }

  async closeAsync(): Promise<void> {
    // In-memory data persists across close/reopen for the session.
  }
}

let instance: WebDatabase | null = null;

/** Tables are created lazily on first access, so no schema copy is needed here. */
export async function getDb(): Promise<WebDatabase> {
  if (!instance) instance = new WebDatabase('lifos.db');
  return instance;
}

export async function resetDatabase(): Promise<void> {
  databases.delete('lifos.db');
  instance = null;
}
