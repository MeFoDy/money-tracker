import { getDb } from '../../config/database.js';
import { buildWhere } from './base.js';

export function getSummaryStats() {
  const db = getDb();
  const totalTx = db.prepare(`SELECT COUNT(*) AS count FROM transactions WHERE is_pending = 0`).get().count;
  const totalIncome = db.prepare(`SELECT SUM(COALESCE(amount_byn, amount)) AS total FROM transactions WHERE tx_type = 'income' AND is_pending = 0`).get().total || 0;
  const totalExpense = db.prepare(`SELECT SUM(ABS(COALESCE(amount_byn, amount))) AS total FROM transactions WHERE tx_type = 'expense' AND is_pending = 0`).get().total || 0;
  const uncategorized = getUncategorizedCount();
  return { totalTx, totalIncome, totalExpense, uncategorized };
}

export function getUncategorizedCount() {
  const row = getDb().prepare(`
    SELECT COUNT(*) AS count FROM transactions WHERE category_id IS NULL AND is_pending = 0
  `).get();
  return row.count;
}

export function getPeriodSummary({ from, to, accountId, categoryIds, search } = {}) {
  const { where, params } = buildWhere({ from, to, accountId, categoryIds, search });
  const sql = `
    SELECT
      SUM(CASE WHEN t.tx_type = 'income' THEN COALESCE(t.amount_byn, t.amount) ELSE 0 END) AS income,
      SUM(CASE WHEN t.tx_type = 'expense' THEN ABS(COALESCE(t.amount_byn, t.amount)) ELSE 0 END) AS expense
    FROM transactions t
    ${where}
  `;
  return getDb().prepare(sql).get(...params);
}
