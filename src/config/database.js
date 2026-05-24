import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations, ensureCategoryRulesTable } from '../migrations/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDbPath() {
  return process.env.DB_PATH || path.join(__dirname, '../../data/finance.db');
}

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new Database(resolveDbPath());
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    runMigrations(dbInstance);
    ensureCategoryRulesTable(dbInstance);
  }
  return dbInstance;
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
