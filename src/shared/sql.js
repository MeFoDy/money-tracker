import { nextDay } from './dates.js';

export function buildWhere({ from, to, accountId, type, categoryId, categoryIds, search, isPending = false, noAlias = false } = {}) {
  const a = noAlias ? '' : 't.';
  const conditions = [];
  const params = [];

  if (from) { conditions.push(`${a}tx_date >= ?`); params.push(from.slice(0, 10)); }
  if (to) { conditions.push(`${a}tx_date < ?`); params.push(nextDay(to.slice(0, 10))); }
  if (accountId) { conditions.push(`${a}account_id = ?`); params.push(accountId); }
  if (type) { conditions.push(`${a}tx_type = ?`); params.push(type); }
  if (categoryIds && categoryIds.length > 0) {
    const hasNull = categoryIds.includes(null);
    const realIds = categoryIds.filter(id => id !== null);
    const parts = [];
    if (realIds.length > 0) {
      parts.push(`${a}category_id IN (${realIds.map(() => '?').join(',')})`);
      params.push(...realIds);
    }
    if (hasNull) {
      parts.push(`${a}category_id IS NULL`);
    }
    if (parts.length > 0) {
      conditions.push(parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`);
    }
  } else if (categoryId !== undefined) {
    if (categoryId === null) conditions.push(`${a}category_id IS NULL`);
    else { conditions.push(`${a}category_id = ?`); params.push(categoryId); }
  }
  if (search) { conditions.push(`${a}description LIKE ?`); params.push(`%${search}%`); }
  conditions.push(`${a}is_pending = ?`); params.push(isPending ? 1 : 0);

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}
