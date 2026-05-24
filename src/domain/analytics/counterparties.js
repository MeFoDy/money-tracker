import { getDb } from '../../config/database.js';
import { buildWhere } from './base.js';

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
