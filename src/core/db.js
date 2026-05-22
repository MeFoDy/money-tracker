import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDbPath() {
  return process.env.DB_PATH || path.join(__dirname, '../../data/finance.db');
}

const MIGRATIONS = [
  // version 1
  `
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_number TEXT NOT NULL UNIQUE,
    name TEXT,
    currency TEXT DEFAULT 'BYN',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    category_id INTEGER REFERENCES categories(id),
    tx_date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    amount_byn REAL,
    currency TEXT NOT NULL DEFAULT 'BYN',
    tx_type TEXT NOT NULL CHECK(tx_type IN ('income', 'expense')),
    is_pending INTEGER NOT NULL DEFAULT 0,
    tx_hash TEXT NOT NULL UNIQUE,
    bank_category TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS category_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    pattern TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    imported_count INTEGER NOT NULL DEFAULT 0,
    duplicates_skipped INTEGER NOT NULL DEFAULT 0,
    updated_from_pending INTEGER NOT NULL DEFAULT 0,
    processed_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pending_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    tx_date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    amount_byn REAL,
    currency TEXT NOT NULL DEFAULT 'BYN',
    tx_hash TEXT NOT NULL UNIQUE,
    bank_category TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(tx_date);
  CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
  CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
  CREATE INDEX IF NOT EXISTS idx_tx_pending ON transactions(is_pending);
  CREATE INDEX IF NOT EXISTS idx_tx_hash ON transactions(tx_hash);
  CREATE INDEX IF NOT EXISTS idx_pending_hash ON pending_transactions(tx_hash);
  `
];

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new Database(resolveDbPath());
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    runMigrations(dbInstance);
  }
  return dbInstance;
}

function runMigrations(db) {
  const currentVersion = db.pragma('user_version', { simple: true });
  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    db.exec(MIGRATIONS[i]);
    db.pragma(`user_version = ${i + 1}`);
  }
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
