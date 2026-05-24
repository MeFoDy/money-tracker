import { getDb } from '../../config/database.js';
import { getPeriodDates } from './base.js';
import { buildWhere } from './base.js';

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
