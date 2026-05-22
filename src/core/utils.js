import { createHash } from 'node:crypto';

export function computeHash({ txDate, amount, currency, description, accountId }) {
  const payload = `${txDate}|${amount}|${currency}|${description}|${accountId}`;
  return createHash('sha256').update(payload).digest('hex');
}

export function cleanAmount(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replaceAll(/\s/g, '').replace(',', '.');
  const val = Number.parseFloat(cleaned);
  return Number.isNaN(val) ? null : val;
}

export function parseDate(raw) {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}:\d{2}:\d{2}))?/);
  if (!m) return null;
  const [, d, mo, y, t] = m;
  return t ? `${y}-${mo}-${d} ${t}` : `${y}-${mo}-${d}`;
}
