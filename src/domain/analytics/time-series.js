import { getDb } from '../../config/database.js';
import { buildWhere } from './base.js';

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

export function getBalanceOverTime({ from, to, accountId } = {}) {
  const { where, params } = buildWhere({ from, to, accountId, noAlias: true });
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
