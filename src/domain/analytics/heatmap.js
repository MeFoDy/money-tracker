import { getDb } from '../../config/database.js';
import { buildWhere } from './base.js';

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
