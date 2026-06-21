import { getDb } from '../../config/database.js';
import { buildWhere } from '../../shared/sql.js';

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
export function getTransactions({ from, to, accountId, categoryIds, search, isPending, limit = 50, offset = 0, orderBy = 'tx_date DESC' } = {}) {
  const { where, params } = buildWhere({ from, to, accountId, categoryIds, search, isPending, noAlias: true });
  const countStmt = getDb().prepare(`SELECT COUNT(*) as total FROM transactions ${where}`);
  const dataStmt = getDb().prepare(`SELECT * FROM transactions ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`);

  const queryParams = [...params, limit, offset];
  const rows = dataStmt.all(...queryParams);
  const total = countStmt.get(...params).total;
  return { rows, total, limit, offset };
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

export function deleteTransaction(id) {
  return getDb().prepare('DELETE FROM transactions WHERE id = ? RETURNING *').get(id);
}
