import { getDb } from '../../config/database.js';

/* ---------- Accounts ---------- */
export function createAccount({ accountNumber, name, currency = 'BYN' }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO accounts (account_number, name, currency)
    VALUES (?, ?, ?)
    ON CONFLICT(account_number) DO UPDATE SET name=excluded.name
    RETURNING *
  `);
  return stmt.get(accountNumber, name, currency);
}

export function getAccountByNumber(accountNumber) {
  return getDb().prepare('SELECT * FROM accounts WHERE account_number = ?').get(accountNumber);
}

export function getAllAccounts() {
  return getDb().prepare('SELECT * FROM accounts ORDER BY created_at DESC').all();
}

export function updateAccountComment(id, comment) {
  return getDb()
    .prepare('UPDATE accounts SET comment = ? WHERE id = ? RETURNING *')
    .get(comment, id);
}
