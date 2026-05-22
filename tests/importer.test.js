import { describe, beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatement } from '../src/core/parser.js';
import { importStatement } from '../src/core/importer.js';
import { getTransactions, getAllAccounts } from '../src/core/repository.js';
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
    assert.deepStrictEqual(numbers, ['5537', '8910', '9274', '9653']);
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
});
