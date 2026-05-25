import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatement } from '../src/domain/transactions/parser.js';

const STATEMENT_PATH = './reports/Vpsk_71487962.csv';

describe('Parser', () => {
  let result;

  test('parses sample statement without error', () => {
    result = parseStatement(STATEMENT_PATH);
    assert.ok(result.completed.length > 0, 'expected completed transactions');
    assert.ok(result.pending.length > 0, 'expected pending transactions');
  });

  test('detects all accounts in completed transactions', () => {
    result = parseStatement(STATEMENT_PATH);
    const accounts = new Set(result.completed.map(t => t.accountNumber));
    assert.deepStrictEqual([...accounts].toSorted(), ['1111', '2222', '3333', '4444']);
  });

  test('parses BYN income transaction correctly', () => {
    result = parseStatement(STATEMENT_PATH);
    const tx = result.completed.find(t => t.txDate.startsWith('2026-05-20') && t.accountNumber === '1111');
    assert.ok(tx, 'expected first completed tx for 1111');
    assert.equal(tx.description, 'Поступление на контракт клиента 319684-97841-379946');
    assert.equal(tx.amount, 11_850.9);
    assert.equal(tx.currency, 'BYN');
    assert.equal(tx.txType, 'income');
  });

  test('parses multivalue EUR transaction correctly', () => {
    result = parseStatement(STATEMENT_PATH);
    const tx = result.completed.find(t => t.currency === 'EUR');
    assert.ok(tx, 'expected EUR transaction');
    assert.equal(tx.amount, -10.35);
    assert.equal(tx.amountByn, -36.85);
  });

  test('parses RUB transactions and amount in BYN', () => {
    result = parseStatement(STATEMENT_PATH);
    const txs = result.completed.filter(t => t.currency === 'RUB');
    assert.ok(txs.length > 0, 'expected RUB transactions');
    // Verify individual RUB transaction amounts match CSV exactly
    const amounts = txs.map(t => t.amount).toSorted((a, b) => a - b);
    // Check first few amounts from CSV (ascending)
    assert.equal(amounts[0], -29_036.12);
    assert.equal(amounts[1], -29_007.65);
    // amountByn should be set for each
    assert.ok(txs.every(t => t.amountByn !== null && typeof t.amountByn === 'number'), 'expected amountByn for all RUB txs');
  });

  test('pending section detected and parsed', () => {
    result = parseStatement(STATEMENT_PATH);
    assert.ok(result.pending.length >= 9, 'expected pending transactions');
    assert.ok(result.pending.every(t => t.accountNumber), 'pending rows must have accountNumber');
  });

  test('pending rows have positive amount (blocked sums)', () => {
    result = parseStatement(STATEMENT_PATH);
    const positive = result.pending.filter(t => t.amount > 0);
    assert.ok(positive.length > 0, 'expected positive amounts in pending');
  });

  test('no total summary rows leaked into data', () => {
    result = parseStatement(STATEMENT_PATH);
    const totalLike = result.completed.some(t => /Всего по контракту/i.test(t.description));
    assert.equal(totalLike, false, 'total summary rows should be skipped');
  });
});
