/**
 * Bring an existing database up to the schema the shipped code expects.
 *
 * The app copies a seed database into place on first launch and never touches
 * it again, which is fine until the code moves on. A machine that installed an
 * earlier build keeps its own database — rightly, it holds the business's work
 * — and the new build then queries columns that database has never heard of.
 * That is how "the column main.BusinessType.protected does not exist" happens:
 * not a packaging fault, an un-upgraded database.
 *
 * The seed database shipped in the bundle is built from the current schema at
 * build time, so it is the reference. Anything it has that the live database
 * lacks is added: whole tables, then missing columns, then indexes.
 *
 * Additive only, deliberately. A column that exists with a different type, and
 * anything that would drop or rewrite data, is reported and left alone — a
 * quotation is worth more than a tidy schema. The live database is copied
 * first, and the copy is put back if anything fails.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const SQLITE = '/usr/bin/sqlite3';

export type SchemaChange = { kind: 'table' | 'column' | 'index'; what: string };
export type SchemaResult = { changes: SchemaChange[]; skipped: string[]; backup?: string };

function sqlite(db: string, sql: string, json = false): string {
  const args = json ? ['-json', db, sql] : [db, sql];
  const run = spawnSync(SQLITE, args, { encoding: 'utf8' });
  if (run.error) throw run.error;
  if (run.status !== 0) throw new Error(`${(run.stderr || '').trim()}\n  while running: ${sql.slice(0, 200)}`);
  return run.stdout;
}

function rows<T>(db: string, sql: string): T[] {
  const out = sqlite(db, sql, true).trim();
  return out ? (JSON.parse(out) as T[]) : [];
}

/** Every object in the file, keyed by name, with the SQL that creates it. */
function objects(db: string) {
  const all = rows<{ type: string; name: string; tbl_name: string; sql: string | null }>(
    db,
    "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'",
  );
  return {
    tables: new Map(all.filter((o) => o.type === 'table').map((o) => [o.name, o])),
    indexes: new Map(all.filter((o) => o.type === 'index').map((o) => [o.name, o])),
  };
}

function columnsOf(db: string, table: string): Set<string> {
  return new Set(
    rows<{ name: string }>(db, `SELECT name FROM pragma_table_info('${table}')`).map((c) => c.name),
  );
}

/**
 * Pull one column's definition out of a CREATE TABLE statement.
 *
 * Prisma writes one column per line, quoted, so the line that starts with the
 * quoted name is the definition. Anything less predictable is left to the
 * caller to report rather than guessed at.
 */
function definitionOf(createSql: string, column: string): string | null {
  for (const raw of createSql.split('\n')) {
    const line = raw.trim().replace(/,$/, '');
    if (line.startsWith(`"${column}"`)) return line;
  }
  return null;
}

export function reconcileSchema(liveDb: string, templateDb: string): SchemaResult {
  if (!fs.existsSync(liveDb) || !fs.existsSync(templateDb)) return { changes: [], skipped: [] };
  if (!fs.existsSync(SQLITE)) return { changes: [], skipped: ['sqlite3 is not available on this Mac'] };

  const want = objects(templateDb);
  const have = objects(liveDb);

  const statements: string[] = [];
  const changes: SchemaChange[] = [];
  const skipped: string[] = [];

  for (const [name, table] of want.tables) {
    if (!have.tables.has(name)) {
      statements.push(table.sql!);
      changes.push({ kind: 'table', what: name });
      continue;
    }
    const live = columnsOf(liveDb, name);
    for (const column of columnsOf(templateDb, name)) {
      if (live.has(column)) continue;
      const definition = definitionOf(table.sql!, column);
      if (!definition) {
        skipped.push(`${name}.${column} — could not read its definition`);
        continue;
      }
      // SQLite refuses a NOT NULL column with no default on an existing table,
      // and there is no safe value to invent for one.
      if (/NOT NULL/i.test(definition) && !/DEFAULT/i.test(definition)) {
        skipped.push(`${name}.${column} — required, with no default to fill the existing rows`);
        continue;
      }
      statements.push(`ALTER TABLE "${name}" ADD COLUMN ${definition}`);
      changes.push({ kind: 'column', what: `${name}.${column}` });
    }
  }

  // Indexes last: one may belong to a table or column only just created.
  for (const [name, index] of want.indexes) {
    if (have.indexes.has(name)) continue;
    statements.push(index.sql!);
    changes.push({ kind: 'index', what: name });
  }

  if (!statements.length) return { changes, skipped };

  const backup = `${liveDb}.before-${new Date().toISOString().slice(0, 10)}`;
  fs.rmSync(backup, { force: true });
  // VACUUM INTO, rather than a file copy, so anything still in the write-ahead
  // log is in the backup too.
  sqlite(liveDb, `VACUUM INTO '${backup.replace(/'/g, "''")}'`);

  try {
    sqlite(liveDb, ['BEGIN;', ...statements.map((s) => `${s};`), 'COMMIT;'].join('\n'));
  } catch (err) {
    fs.copyFileSync(backup, liveDb);
    throw new Error(
      `The database could not be brought up to date, so it was put back as it was.\n\n${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  return { changes, skipped, backup };
}
