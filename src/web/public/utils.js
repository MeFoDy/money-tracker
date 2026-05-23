/**
 * Format ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...) to DD.MM.YY.
 * Parses year/month/day explicitly, then builds a local Date to avoid timezone shifts.
 * Returns empty string for falsy or malformed input.
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDate(isoDate) {
  if (!isoDate) return '';
  const datePart = String(isoDate).split(/[T ]/)[0];
  const [yearStr, monthStr, dayStr] = datePart.split('-');
  if (!yearStr || !monthStr || !dayStr) return '';
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return '';
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  // Build Date from explicit local components to avoid UTC interpretation
  const d = new Date(year, month - 1, day);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}
