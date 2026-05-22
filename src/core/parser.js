import fs from 'node:fs';
import iconv from 'iconv-lite';
import { parse } from 'csv-parse/sync';

const HEADER_9_FIRST = 'Дата транзакции';
const HEADER_8_FIRST = 'Дата транзакции';

const ACCOUNT_RE = /Операции по \.+(\d+)/;
const PENDING_RE = /Заблокированные суммы по \.+(\d+)/;
const TOTAL_RE = /^Всего по контракту/i;

function cleanAmount(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replaceAll(/\s/g, '').replace(',', '.');
  const val = Number.parseFloat(cleaned);
  return Number.isNaN(val) ? null : val;
}

function parseDate(raw) {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}:\d{2}:\d{2}))?/);
  if (!m) return null;
  const [, d, mo, y, t] = m;
  return t ? `${y}-${mo}-${d} ${t}` : `${y}-${mo}-${d}`;
}

function detectSectionStart(row) {
  const line = row.join(';');
  const accountMatch = line.match(ACCOUNT_RE);
  if (accountMatch) return { type: 'completed', accountNumber: accountMatch[1], source: line };
  const pendingMatch = line.match(PENDING_RE);
  if (pendingMatch) return { type: 'pending', accountNumber: pendingMatch[1], source: line };
  return null;
}

function isHeader9(cols) {
  return cols[0]?.trim() === HEADER_9_FIRST && cols.length >= 9;
}

function isHeader8(cols) {
  return cols[0]?.trim() === HEADER_8_FIRST && cols.length === 8;
}

function isDataRow(cols) {
  return cols.length >= 8 && cols[0] && /\d{2}\.\d{2}\.\d{4}/.test(cols[0]);
}

export function parseStatement(bufferOrPath) {
  let buffer;
  buffer = Buffer.isBuffer(bufferOrPath) ? bufferOrPath : fs.readFileSync(bufferOrPath);

  const text = iconv.decode(buffer, 'windows-1251');
  const records = parse(text, {
    delimiter: ';',
    relax_column_count: true,
    skip_empty_lines: false,
    quote: false  // Important: bank CSV uses " inside descriptions as chars, not quotes
  });

  const completed = [];
  const pending = [];

  let currentContext = null;

  for (const row of records) {

    // Detect section start
    const section = detectSectionStart(row);
    if (section) {
      currentContext = section;
      continue;
    }

    // Detect total summary rows explicitly (they start with a date but are actually totals)
    const firstCol = (row[0] || '').trim();
    const secondCol = (row[1] || '').trim();
    if (TOTAL_RE.test(secondCol) || TOTAL_RE.test(firstCol)) {
      // Reset context so that rows after totals are not swallowed by previous account
      currentContext = null;
      continue;
    }

    // Detect header rows
    if (isHeader9(row) || isHeader8(row)) {
      // Next rows are data until empty or new section
      continue;
    }

    // Skip empty/invalid rows
    if (!isDataRow(row)) {
      continue;
    }

    // Additional total guard inside a data row (shouldn't normally trigger after firstCol check but safe to keep)
    if (TOTAL_RE.test(secondCol) || TOTAL_RE.test(firstCol)) {
      currentContext = null;
      continue;
    }

    if (!currentContext) {
      continue; // orphaned data row without a context
    }

    if (currentContext.type === 'completed') {
      completed.push(extractCompleted(row, currentContext.accountNumber));
    } else {
      pending.push(extractPending(row, currentContext.accountNumber));
    }
  }

  return { completed, pending };
}

function extractCompleted(cols, accountNumber) {
  const amount = cleanAmount(cols[2]);
  const amountByn = cleanAmount(cols[6]);
  return {
    accountNumber,
    txDate: parseDate(cols[0]),
    description: (cols[1] || '').trim(),
    amount,
    currency: (cols[3] || 'BYN').trim(),
    postingDate: parseDate(cols[4]),
    commission: cleanAmount(cols[5]),
    amountByn,
    digitalCard: (cols[7] || '').trim() || null,
    bankCategory: (cols[8] || '').trim() || null,
    txType: amount !== null && amount > 0 ? 'income' : 'expense'
  };
}

function extractPending(cols, accountNumber) {
  const amount = cleanAmount(cols[2]);
  const amountByn = cleanAmount(cols[4]);
  return {
    accountNumber,
    txDate: parseDate(cols[0]),
    description: (cols[1] || '').trim(),
    amount,
    currency: (cols[3] || 'BYN').trim(),
    amountByn,
    digitalCard: (cols[6] || '').trim() || null,
    bankCategory: (cols[7] || '').trim() || null,
    txType: amount !== null && amount > 0 ? 'income' : 'expense'
  };
}
