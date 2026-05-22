import { getDb } from './db.js';

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

/* ---------- Categories ---------- */
export function createCategory({ name, color }) {
  const stmt = getDb().prepare('INSERT INTO categories (name, color) VALUES (?, ?) RETURNING *');
  return stmt.get(name, color);
}

export function getCategoryByName(name) {
  return getDb().prepare('SELECT * FROM categories WHERE name = ?').get(name);
}

export function getAllCategories() {
  return getDb().prepare('SELECT * FROM categories ORDER BY name').all();
}

export function updateCategory(id, { name, color }) {
  const stmt = getDb().prepare('UPDATE categories SET name = ?, color = ? WHERE id = ? RETURNING *');
  return stmt.get(name, color, id);
}

export function deleteCategory(id) {
  getDb().prepare('DELETE FROM categories WHERE id = ?').run(id);
}

/* ---------- Category Rules ---------- */
export function createRule({ categoryId, pattern, priority = 0 }) {
  const stmt = getDb().prepare('INSERT INTO category_rules (category_id, pattern, priority) VALUES (?, ?, ?) RETURNING *');
  return stmt.get(categoryId, pattern, priority);
}

export function getRules() {
  return getDb().prepare('SELECT * FROM category_rules ORDER BY priority DESC, created_at DESC').all();
}

/* ---------- Transactions ---------- */
export function createTransaction({ accountId, categoryId, txDate, description, amount, amountByn, currency, txType, txHash, bankCategory, isPending = 0 }) {
  const stmt = getDb().prepare(`
    INSERT INTO transactions (account_id, category_id, tx_date, description, amount, amount_byn, currency, tx_type, tx_hash, bank_category, is_pending)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tx_hash) DO NOTHING
    RETURNING *
  `);
  return stmt.get(accountId, categoryId, txDate, description, amount, amountByn, currency, txType, txHash, bankCategory, isPending);
}

export function getTransactionByHash(txHash) {
  return getDb().prepare('SELECT * FROM transactions WHERE tx_hash = ?').get(txHash);
}

export function updateTransactionCategory(id, categoryId) {
  const stmt = getDb().prepare('UPDATE transactions SET category_id = ? WHERE id = ? RETURNING *');
  return stmt.get(categoryId, id);
}

export function bulkUpdateCategory(ids, categoryId) {
  const db = getDb();
  const stmt = db.prepare('UPDATE transactions SET category_id = ? WHERE id = ?');
  const updateMany = db.transaction((ids) => {
    for (const id of ids) stmt.run(categoryId, id);
  });
  updateMany(ids);
}

export function updatePendingToCompleted(txHash, { categoryId, amount, amountByn, bankCategory }) {
  const stmt = getDb().prepare(`
    UPDATE transactions
    SET is_pending = 0, category_id = COALESCE(?, category_id), amount = ?, amount_byn = ?, bank_category = COALESCE(?, bank_category)
    WHERE tx_hash = ?
    RETURNING *
  `);
  return stmt.get(categoryId, amount, amountByn, bankCategory, txHash);
}

/* ---------- Filtering ---------- */
export function getTransactions({ from, to, accountId, categoryId, search, isPending, limit = 50, offset = 0, orderBy = 'tx_date DESC' } = {}) {
  const conditions = [];
  const params = [];

  if (from) { conditions.push('tx_date >= ?'); params.push(from); }
  if (to) { conditions.push('tx_date <= ?'); params.push(to); }
  if (accountId) { conditions.push('account_id = ?'); params.push(accountId); }
  if (categoryId !== undefined) {
    if (categoryId === null) conditions.push('category_id IS NULL');
    else { conditions.push('category_id = ?'); params.push(categoryId); }
  }
  if (isPending !== undefined) { conditions.push('is_pending = ?'); params.push(isPending ? 1 : 0); }
  if (search) { conditions.push('description LIKE ?'); params.push(`%${search}%`); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countStmt = getDb().prepare(`SELECT COUNT(*) as total FROM transactions ${where}`);
  const dataStmt = getDb().prepare(`SELECT * FROM transactions ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`);

  params.push(limit, offset);
  const rows = dataStmt.all(...params);
  const total = countStmt.get(...params.slice(0, -2)).total;
  return { rows, total, limit, offset };
}

/* ---------- Uploads ---------- */
export function createUpload({ filename, importedCount, duplicatesSkipped, updatedFromPending }) {
  const stmt = getDb().prepare(`
    INSERT INTO uploads (filename, imported_count, duplicates_skipped, updated_from_pending)
    VALUES (?, ?, ?, ?)
    RETURNING *
  `);
  return stmt.get(filename, importedCount, duplicatesSkipped, updatedFromPending);
}

/* ---------- Pending Transactions ---------- */
export function createPending({ accountId, txDate, description, amount, amountByn, currency, txHash, bankCategory }) {
  const stmt = getDb().prepare(`
    INSERT INTO pending_transactions (account_id, tx_date, description, amount, amount_byn, currency, tx_hash, bank_category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tx_hash) DO NOTHING
    RETURNING *
  `);
  return stmt.get(accountId, txDate, description, amount, amountByn, currency, txHash, bankCategory);
}

export function getPendingByHash(txHash) {
  return getDb().prepare('SELECT * FROM pending_transactions WHERE tx_hash = ?').get(txHash);
}
