import { describe, beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatement } from '../src/domain/transactions/parser.js';
import { importStatement, previewImport, confirmImport } from '../src/domain/transactions/importer.js';
import { getTransactions } from '../src/domain/transactions/index.js';
import { getAllAccounts } from '../src/domain/accounts/index.js';
import { setupTestDb, teardownTestDb } from './_helper.js';

const STATEMENT_PATH = './reports/Vpsk_71487962.csv';

describe('Importer', () => {
  let ctx;

  beforeEach(() => {
    ctx = setupTestDb();
  });

  afterEach(() => {
    teardownTestDb(ctx);
  });

  test('imports first time successfully', () => {
    const parsed = parseStatement(STATEMENT_PATH);
    const result = importStatement({ ...parsed, originalFilename: 'test.csv' });
    assert.ok(result.imported > 0, 'expected imports');
    assert.equal(result.duplicatesSkipped, 0);
    assert.equal(result.updatedFromPending, 0);
  });

  test('deduplicates on second import', () => {
    const parsed = parseStatement(STATEMENT_PATH);
    importStatement({ ...parsed, originalFilename: 'a.csv' });
    const r2 = importStatement({ ...parsed, originalFilename: 'b.csv' });
    assert.ok(r2.duplicatesSkipped > 0, 'expected duplicates on re-import');
    assert.equal(r2.imported, 0);
  });

  test('creates accounts for each detected account number', () => {
    const parsed = parseStatement(STATEMENT_PATH);
    importStatement({ ...parsed, originalFilename: 'test.csv' });
    const accounts = getAllAccounts();
    const numbers = accounts.map(a => a.account_number).toSorted();
    assert.deepStrictEqual(numbers, ['1111', '2222', '3333', '4444']);
  });

  test('pending transactions are inserted with is_pending=1', () => {
    const parsed = parseStatement(STATEMENT_PATH);
    importStatement({ ...parsed, originalFilename: 'test.csv' });
    const pendingTxs = getTransactions({ isPending: 1, limit: 1000 });
    assert.ok(pendingTxs.rows.length > 0, 'expected pending transactions');
    assert.ok(pendingTxs.rows.every(t => t.is_pending === 1));
  });

  test('completed transactions are not pending', () => {
    const parsed = parseStatement(STATEMENT_PATH);
    importStatement({ ...parsed, originalFilename: 'test.csv' });
    const all = getTransactions({ limit: 10_000 });
    const completedRows = all.rows.filter(t => t.is_pending === 0);
    assert.ok(completedRows.length > 0, 'expected completed transactions');
  });

  test('pending transaction is upgraded to completed when same tx arrives as completed', () => {
    const tx = {
      txDate: '2024-03-01',
      amount: -50,
      amountByn: -50,
      currency: 'BYN',
      description: 'Test payment',
      txType: 'expense',
      accountNumber: 'TEST001',
      bankCategory: null
    };

    // Import as pending first
    const r1 = importStatement({ completed: [], pending: [tx], originalFilename: 'a.csv' });
    assert.equal(r1.imported, 1);
    assert.equal(r1.updatedFromPending, 0);

    // Verify it's in DB as pending
    const preview1 = previewImport({ completed: [tx], pending: [], originalFilename: 'b.csv' });
    const previewTx = preview1.transactions[0];
    assert.ok(previewTx, 'should have a transaction in preview');
    assert.equal(previewTx.isDuplicate, false, 'pending→completed upgrade must NOT be flagged as duplicate');

    // Import as completed now
    const r2 = confirmImport({ transactions: preview1.transactions, originalFilename: 'b.csv' });
    assert.equal(r2.updatedFromPending, 1, 'should upgrade pending to completed');
    assert.equal(r2.duplicatesSkipped, 0, 'should not count as duplicate');

    // Verify it's now completed in DB
    const all = getTransactions({ limit: 1000 });
    const found = all.rows.find(t => t.description === 'Test payment');
    assert.ok(found, 'transaction must exist');
    assert.equal(found.is_pending, 0, 'transaction must be completed');
  });
});
