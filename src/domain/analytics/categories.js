import { getDb } from '../../config/database.js';
import { getPeriodDates } from './base.js';
import { buildWhere } from './base.js';

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

export function getPeriodComparison({ from, to, accountId, type = 'expense', categoryIds } = {}) {
  const { currentFrom, currentTo, prevFrom, prevTo } = getPeriodDates(from, to);

  const { where: curWhere, params: curParams } = buildWhere({ from: currentFrom, to: currentTo, accountId, type, categoryIds });
  const { where: prevWhere, params: prevParams } = buildWhere({ from: prevFrom, to: prevTo, accountId, type, categoryIds });

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
