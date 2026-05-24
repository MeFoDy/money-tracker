import { createHash } from 'node:crypto';

export function computeHash({ txDate, amount, currency, description, accountId }) {
  const payload = `${txDate}|${amount}|${currency}|${description}|${accountId}`;
  return createHash('sha256').update(payload).digest('hex');
}
