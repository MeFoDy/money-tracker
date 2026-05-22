import { getDb } from './db.js';

function buildWhere({ from, to, accountId, type, categoryId, isPending = false, noAlias = false } = {}) {
  const a = noAlias ? '' : 't.';
  const conditions = [];
  const params = [];

  if (from) { conditions.push(`${a}tx_date >= ?`); params.push(from); }
  if (to) { conditions.push(`${a}tx_date <= ?`); params.push(to); }
  if (accountId) { conditions.push(`${a}account_id = ?`); params.push(accountId); }
  if (type) { conditions.push(`${a}tx_type = ?`); params.push(type); }
  if (categoryId !== undefined) {
    if (categoryId === null) conditions.push(`${a}category_id IS NULL`);
    else { conditions.push(`${a}category_id = ?`); params.push(categoryId); }
  }
  conditions.push(`${a}is_pending = ?`); params.push(isPending ? 1 : 0);

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

/**
 * @returns {Array<{category_id: number|null, name: string, color: string|null, total: number, type: string}>}
 */
export function getSpendingByCategory({ from, to, accountId, type = 'expense' } = {}) {
  const { where, params } = buildWhere({ from, to, accountId, type });
  const sql = `
    SELECT
      t.category_id,
      COALESCE(c.name, 'Без категории') AS name,
      c.color,
      SUM(COALESCE(t.amount_byn, ABS(t.amount))) AS total
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    ${where}
    GROUP BY t.category_id
    ORDER BY total DESC
  `;
  return getDb().prepare(sql).all(...params);
}

/**
 * @returns {Array<{month: string, income: number, expense: number}>}
 */
export function getMonthlySummary({ from, to, accountId } = {}) {
  const { where, params } = buildWhere({ from, to, accountId });
  const sql = `
    SELECT
      strftime('%Y-%m', t.tx_date) AS month,
      SUM(CASE WHEN t.tx_type = 'income' THEN COALESCE(t.amount_byn, t.amount) ELSE 0 END) AS income,
      SUM(CASE WHEN t.tx_type = 'expense' THEN COALESCE(t.amount_byn, ABS(t.amount)) ELSE 0 END) AS expense
    FROM transactions t
    ${where}
    GROUP BY month
    ORDER BY month
  `;
  return getDb().prepare(sql).all(...params);
}

/**
 * @returns {Array<{description: string, count: number, total: number}>}
 */
export function getTopCounterparties({ from, to, accountId, type = 'expense', limit = 10 } = {}) {
  const { where, params } = buildWhere({ from, to, accountId, type });
  const sql = `
    SELECT
      t.description,
      COUNT(*) AS count,
      SUM(COALESCE(t.amount_byn, ABS(t.amount))) AS total
    FROM transactions t
    ${where}
    GROUP BY t.description
    ORDER BY total DESC
    LIMIT ?
  `;
  return getDb().prepare(sql).all(...params, limit);
}

/**
 * @returns {Array<{date: string, balance: number}>}
 */
export function getBalanceOverTime({ from, to, accountId } = {}) {
  const { where, params } = buildWhere({ from, to, accountId, noAlias: true });
  // Use a CTE for ordered daily net, then cumulative sum
  const sql = `
    WITH daily AS (
      SELECT
        tx_date AS date,
        SUM(CASE WHEN tx_type = 'income' THEN COALESCE(amount_byn, amount) ELSE -COALESCE(amount_byn, ABS(amount)) END) AS net
      FROM transactions
      ${where}
      GROUP BY tx_date
      ORDER BY tx_date
    )
    SELECT
      date,
      SUM(net) OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balance
    FROM daily
    ORDER BY date
  `;
  return getDb().prepare(sql).all(...params);
}

export function getUncategorizedCount() {
  const row = getDb().prepare(`
    SELECT COUNT(*) AS count FROM transactions WHERE category_id IS NULL AND is_pending = 0
  `).get();
  return row.count;
}

export function getSummaryStats() {
  const db = getDb();
  const totalTx = db.prepare(`SELECT COUNT(*) AS count FROM transactions WHERE is_pending = 0`).get().count;
  const totalIncome = db.prepare(`SELECT SUM(COALESCE(amount_byn, amount)) AS total FROM transactions WHERE tx_type = 'income' AND is_pending = 0`).get().total || 0;
  const totalExpense = db.prepare(`SELECT SUM(COALESCE(amount_byn, ABS(amount))) AS total FROM transactions WHERE tx_type = 'expense' AND is_pending = 0`).get().total || 0;
  const uncategorized = getUncategorizedCount();
  return { totalTx, totalIncome, totalExpense, uncategorized };
}
