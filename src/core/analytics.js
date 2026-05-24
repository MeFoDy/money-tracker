import { getDb } from './db.js';

function nextDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

function buildWhere({ from, to, accountId, type, categoryId, categoryIds, isPending = false, noAlias = false } = {}) {
  const a = noAlias ? '' : 't.';
  const conditions = [];
  const params = [];

  if (from) { conditions.push(`${a}tx_date >= ?`); params.push(from.slice(0, 10)); }
  if (to) { conditions.push(`${a}tx_date < ?`); params.push(nextDay(to.slice(0, 10))); }
  if (accountId) { conditions.push(`${a}account_id = ?`); params.push(accountId); }
  if (type) { conditions.push(`${a}tx_type = ?`); params.push(type); }
  if (categoryIds && categoryIds.length > 0) {
    const placeholders = categoryIds.map(() => '?').join(',');
    conditions.push(`${a}category_id IN (${placeholders})`);
    params.push(...categoryIds);
  } else if (categoryId !== undefined) {
    if (categoryId === null) conditions.push(`${a}category_id IS NULL`);
    else { conditions.push(`${a}category_id = ?`); params.push(categoryId); }
  }
  conditions.push(`${a}is_pending = ?`); params.push(isPending ? 1 : 0);

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

function parseLocalDate(dateStr) {
  const datePart = dateStr.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTransactionDateRange() {
  const row = getDb().prepare(`SELECT DATE(MIN(tx_date)) AS min, DATE(MAX(tx_date)) AS max FROM transactions WHERE is_pending = 0`).get();
  return { min: row.min || null, max: row.max || null };
}

function getPeriodDates(from, to) {
  let currentFrom = from;
  let currentTo = to;
  if (!currentFrom || !currentTo) {
    const range = getTransactionDateRange();
    const now = new Date();
    currentFrom = currentFrom || range.min || formatLocalDate(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    currentTo = currentTo || range.max || formatLocalDate(now);
  }
  const fromDate = parseLocalDate(currentFrom);
  const toDate = parseLocalDate(currentTo);
  const durationMs = toDate.getTime() - fromDate.getTime();
  const prevToDate = new Date(fromDate.getTime() - 86_400_000);
  const prevFromDate = new Date(prevToDate.getTime() - durationMs);
  return {
    currentFrom,
    currentTo,
    prevFrom: formatLocalDate(prevFromDate),
    prevTo: formatLocalDate(prevToDate)
  };
}

function getPeriodSummaryRaw({ from, to, accountId, categoryIds, type } = {}) {
  const { where, params } = buildWhere({ from, to, accountId, categoryIds, type });
  const sql = `
    SELECT
      SUM(CASE WHEN t.tx_type = 'income' THEN COALESCE(t.amount_byn, t.amount) ELSE 0 END) AS income,
      SUM(CASE WHEN t.tx_type = 'expense' THEN ABS(COALESCE(t.amount_byn, t.amount)) ELSE 0 END) AS expense,
      COUNT(*) AS tx_count
    FROM transactions t
    ${where}
  `;
  return getDb().prepare(sql).get(...params);
}

function getTopCategoryRaw({ from, to, accountId, categoryIds } = {}) {
  const { where, params } = buildWhere({ from, to, accountId, type: 'expense', categoryIds });
  const sql = `
    SELECT
      COALESCE(c.name, 'Без категории') AS name,
      SUM(ABS(COALESCE(t.amount_byn, t.amount))) AS total
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    ${where}
    GROUP BY t.category_id
    ORDER BY total DESC
    LIMIT 1
  `;
  return getDb().prepare(sql).get(...params);
}

/**
 * @returns {{balance: number, income: number, incomeDelta: number, incomeDeltaPercent: number, expense: number, expenseDelta: number, expenseDeltaPercent: number, topCategory: {name: string, amount: number}, transactionCount: number}}
 */
export function getKpiMetrics({ from, to, accountId, categoryIds, type } = {}) {
  const { currentFrom, currentTo, prevFrom, prevTo } = getPeriodDates(from, to);

  const current = getPeriodSummaryRaw({ from: currentFrom, to: currentTo, accountId, categoryIds, type });
  const previous = getPeriodSummaryRaw({ from: prevFrom, to: prevTo, accountId, categoryIds, type });
  const topCat = getTopCategoryRaw({ from: currentFrom, to: currentTo, accountId, categoryIds });

  const income = current.income || 0;
  const expense = current.expense || 0;
  const prevIncome = previous.income || 0;
  const prevExpense = previous.expense || 0;

  const incomeDelta = prevIncome > 0 ? income - prevIncome : 0;
  const incomeDeltaPercent = prevIncome > 0 ? Math.round((incomeDelta / prevIncome) * 1000) / 10 : 0;
  const expenseDelta = prevExpense > 0 ? expense - prevExpense : 0;
  const expenseDeltaPercent = prevExpense > 0 ? Math.round((expenseDelta / prevExpense) * 1000) / 10 : 0;

  return {
    balance: income - expense,
    income,
    incomeDelta,
    incomeDeltaPercent,
    expense,
    expenseDelta,
    expenseDeltaPercent,
    topCategory: topCat || { name: '—', total: 0 },
    transactionCount: current.tx_count || 0,
    prevPeriod: { from: prevFrom, to: prevTo, income: prevIncome, expense: prevExpense }
  };
}

/**
 * @returns {Array<{period: string, income: number, expense: number, cumulativeBalance: number}>}
 */
export function getIncomeExpenseOverTime({ from, to, accountId, categoryIds, type, groupBy = 'month' } = {}) {
  const { where, params } = buildWhere({ from, to, accountId, categoryIds, type, noAlias: true });

  let periodExpr;
  if (groupBy === 'day') periodExpr = "DATE(tx_date)";
  else if (groupBy === 'week') periodExpr = "strftime('%Y-%W', tx_date)";
  else periodExpr = "strftime('%Y-%m', tx_date)";

  const sql = `
    WITH daily AS (
      SELECT
        ${periodExpr} AS period,
        SUM(CASE WHEN tx_type = 'income' THEN COALESCE(amount_byn, amount) ELSE 0 END) AS income,
        SUM(CASE WHEN tx_type = 'expense' THEN ABS(COALESCE(amount_byn, amount)) ELSE 0 END) AS expense
      FROM transactions
      ${where}
      GROUP BY period
      ORDER BY period
    )
    SELECT
      period,
      income,
      expense,
      SUM(income - expense) OVER (ORDER BY period ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_balance
    FROM daily
    ORDER BY period
  `;
  return getDb().prepare(sql).all(...params);
}

/**
 * @returns {Array<{category_id: number|null, name: string, color: string|null, total: number, type: string}>}
 */
export function getSpendingByCategory({ from, to, accountId, categoryIds, type = 'expense' } = {}) {
  const { where, params } = buildWhere({ from, to, accountId, categoryIds, type });
  const sql = `
    SELECT
      t.category_id,
      COALESCE(c.name, 'Без категории') AS name,
      c.color,
      SUM(ABS(COALESCE(t.amount_byn, t.amount))) AS total
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
      SUM(CASE WHEN t.tx_type = 'expense' THEN ABS(COALESCE(t.amount_byn, t.amount)) ELSE 0 END) AS expense
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
      SUM(ABS(COALESCE(t.amount_byn, t.amount))) AS total
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
        SUM(CASE WHEN tx_type = 'income' THEN COALESCE(amount_byn, amount) ELSE -ABS(COALESCE(amount_byn, amount)) END) AS net
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
  const totalExpense = db.prepare(`SELECT SUM(ABS(COALESCE(amount_byn, amount))) AS total FROM transactions WHERE tx_type = 'expense' AND is_pending = 0`).get().total || 0;
  const uncategorized = getUncategorizedCount();
  return { totalTx, totalIncome, totalExpense, uncategorized };
}

/**
 * @returns {{income: number, expense: number}}
 */
export function getPeriodSummary({ from, to, accountId } = {}) {
  const { where, params } = buildWhere({ from, to, accountId });
  const sql = `
    SELECT
      SUM(CASE WHEN t.tx_type = 'income' THEN COALESCE(t.amount_byn, t.amount) ELSE 0 END) AS income,
      SUM(CASE WHEN t.tx_type = 'expense' THEN ABS(COALESCE(t.amount_byn, t.amount)) ELSE 0 END) AS expense
    FROM transactions t
    ${where}
  `;
  return getDb().prepare(sql).get(...params);
}

/** @returns {Array<{category_id: number|null, name: string, color: string|null, current: number, previous: number, delta: number, deltaPercent: number}>} */
export function getPeriodComparison({ from, to, accountId, type = 'expense', categoryIds } = {}) {
  const { currentFrom, currentTo, prevFrom, prevTo } = getPeriodDates(from, to);

  const { where: curWhere, params: curParams } = buildWhere({ from: currentFrom, to: currentTo, accountId, type, categoryIds });
  const { where: prevWhere, params: prevParams } = buildWhere({ from: prevFrom, to: prevTo, accountId, type, categoryIds });

  // SQLite does not support FULL OUTER JOIN; emulate with UNION
  const sqliteSql = `
    WITH current AS (
      SELECT t.category_id, COALESCE(c.name, 'Без категории') AS name, c.color,
             SUM(ABS(COALESCE(t.amount_byn, t.amount))) AS total
      FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
      ${curWhere}
      GROUP BY t.category_id
    ),
    previous AS (
      SELECT t.category_id, SUM(ABS(COALESCE(t.amount_byn, t.amount))) AS total
      FROM transactions t
      ${prevWhere}
      GROUP BY t.category_id
    ),
    combined AS (
      SELECT
        COALESCE(cur.category_id, prev.category_id) AS category_id,
        COALESCE(cur.name, (SELECT COALESCE(c2.name, 'Без категории') FROM categories c2 WHERE c2.id = prev.category_id), 'Без категории') AS name,
        COALESCE(cur.color, (SELECT c2.color FROM categories c2 WHERE c2.id = prev.category_id)) AS color,
        COALESCE(cur.total, 0) AS current,
        COALESCE(prev.total, 0) AS previous,
        COALESCE(cur.total, 0) - COALESCE(prev.total, 0) AS delta,
        CASE WHEN COALESCE(prev.total, 0) > 0 THEN ROUND(((COALESCE(cur.total, 0) - prev.total) * 100.0) / prev.total, 1) ELSE 0 END AS deltaPercent
      FROM current cur
      LEFT JOIN previous prev ON cur.category_id = prev.category_id
      UNION ALL
      SELECT
        prev.category_id,
        COALESCE((SELECT COALESCE(c2.name, 'Без категории') FROM categories c2 WHERE c2.id = prev.category_id), 'Без категории') AS name,
        (SELECT c2.color FROM categories c2 WHERE c2.id = prev.category_id) AS color,
        0 AS current,
        prev.total AS previous,
        -prev.total AS delta,
        CASE WHEN prev.total > 0 THEN -100 ELSE 0 END AS deltaPercent
      FROM previous prev
      WHERE prev.category_id NOT IN (SELECT category_id FROM current)
    )
    SELECT * FROM combined ORDER BY ABS(delta) DESC
  `;
  return getDb().prepare(sqliteSql).all(...curParams, ...prevParams);
}

/** @returns {Array<{dayOfWeek: number, week: string, value: number, date: string}>} */
export function getHeatmapData({ from, to, accountId, mode = 'expense', categoryIds } = {}) {
  const type = mode === 'count' ? undefined : mode;
  const { where, params } = buildWhere({ from, to, accountId, type, categoryIds, noAlias: true });

  let valueExpr;
  if (mode === 'count') {
    valueExpr = 'COUNT(*)';
  } else if (mode === 'income') {
    valueExpr = "SUM(CASE WHEN tx_type = 'income' THEN COALESCE(amount_byn, amount) ELSE 0 END)";
  } else {
    valueExpr = "SUM(CASE WHEN tx_type = 'expense' THEN ABS(COALESCE(amount_byn, amount)) ELSE 0 END)";
  }

  const sql = `
    SELECT
      (CAST(strftime('%w', tx_date) AS INTEGER) + 6) % 7 AS dayOfWeek,
      strftime('%Y-%W', tx_date) AS week,
      ${valueExpr} AS value,
      COUNT(*) AS count,
      SUM(CASE WHEN tx_type = 'income' THEN COALESCE(amount_byn, amount) ELSE 0 END) -
      SUM(CASE WHEN tx_type = 'expense' THEN ABS(COALESCE(amount_byn, amount)) ELSE 0 END) AS profit,
      DATE(tx_date) AS date
    FROM transactions
    ${where}
    GROUP BY DATE(tx_date)
    ORDER BY DATE(tx_date)
  `;
  return getDb().prepare(sql).all(...params);
}
