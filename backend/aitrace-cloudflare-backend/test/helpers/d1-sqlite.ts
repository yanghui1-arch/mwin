import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The bound-statement surface Drizzle's D1 driver actually executes for selects. */
export interface D1BoundStatement {
  sql: string;
  values: Array<string | number | null>;
  all(): Promise<{ results: unknown[] }>;
  raw(): Promise<unknown[][]>;
}

/** Minimal D1Database shim over node:sqlite for running Drizzle selects locally. */
export class D1Shim {
  constructor(protected readonly db: DatabaseSync) {}
  prepare(sql: string) {
    const statement = this.db.prepare(sql);
    const bound = (params: unknown[]) => {
      const values = params as Array<string | number | null>;
      return {
        sql,
        values,
        all: async () => ({ results: statement.all(...values) }),
        raw: async () => statement.all(...values).map((row) => Object.values(row)),
      };
    };
    return { bind: (...params: unknown[]): D1BoundStatement => bound(params) };
  }
  async batch(statements: D1BoundStatement[]) {
    return Promise.all(statements.map(async () => ({ meta: { changes: 0 }, results: [] })));
  }
}

/** D1 shim whose batch executes the statements in one real SQLite transaction. */
export class SqliteD1Db extends D1Shim {
  override async batch(statements: D1BoundStatement[]) {
    this.db.exec('BEGIN');
    try {
      const results = statements.map((statement) => {
        const result = this.db.prepare(statement.sql).run(...statement.values);
        return { meta: { changes: Number(result.changes) }, results: [] };
      });
      this.db.exec('COMMIT');
      return results;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}

/** Builds an in-memory D1 database by replaying the production migration files. */
export function buildMigratedDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  const migrationsDirectory = join(import.meta.dirname, '..', '..', 'migrations');
  const migrationFiles = readdirSync(migrationsDirectory).filter((name) => name.endsWith('.sql')).sort();
  for (const file of migrationFiles) db.exec(readFileSync(join(migrationsDirectory, file), 'utf8'));
  return db;
}
