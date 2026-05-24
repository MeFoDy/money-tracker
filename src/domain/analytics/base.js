import { getDb } from '../../config/database.js';
import { formatLocalDate, parseLocalDate } from '../../shared/dates.js';


export function getTransactionDateRange() {
  const row = getDb().prepare(`SELECT DATE(MIN(tx_date)) AS min, DATE(MAX(tx_date)) AS max FROM transactions WHERE is_pending = 0`).get();
  return { min: row.min || null, max: row.max || null };
}

export function getPeriodDates(from, to) {
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



export {buildWhere} from '../../shared/sql.js';