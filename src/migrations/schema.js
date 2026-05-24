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
  `,
  // version 3 — возвращаем авто-категоризацию с расширенными правилами
  `
  DROP TABLE IF EXISTS category_rules;

  CREATE TABLE IF NOT EXISTS category_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    description_pattern TEXT,
    min_amount REAL,
    max_amount REAL,
    account_id INTEGER REFERENCES accounts(id),
    currency TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_rules_active ON category_rules(is_active);
  CREATE INDEX IF NOT EXISTS idx_rules_priority ON category_rules(priority DESC);
  `
];

export function runMigrations(db) {
  const currentVersion = db.pragma('user_version', { simple: true });
  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    db.exec(MIGRATIONS[i]);
    db.pragma(`user_version = ${i + 1}`);
  }
}

export function ensureCategoryRulesTable(db) {
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'category_rules'
  `).get();
  if (!tableExists) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS category_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        description_pattern TEXT,
        min_amount REAL,
        max_amount REAL,
        account_id INTEGER REFERENCES accounts(id),
        currency TEXT,
        priority INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_rules_active ON category_rules(is_active);
      CREATE INDEX IF NOT EXISTS idx_rules_priority ON category_rules(priority DESC);
    `);
  }
}
