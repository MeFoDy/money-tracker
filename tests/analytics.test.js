import { describe, beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatement } from '../src/core/parser.js';
import { importStatement } from '../src/core/importer.js';
import {
  getSpendingByCategory,
  getMonthlySummary,
  getTopCounterparties,
  getBalanceOverTime,
  getSummaryStats,
  getUncategorizedCount,
  getKpiMetrics,
  getIncomeExpenseOverTime
} from '../src/core/analytics.js';
import { setupTestDb, teardownTestDb } from './_helper.js';

const STATEMENT_PATH = './reports/Vpsk_71487962.csv';

describe('Analytics', () => {
  let ctx;

  beforeEach(() => {
    ctx = setupTestDb();
    const parsed = parseStatement(STATEMENT_PATH);
    importStatement({ ...parsed, originalFilename: 'seed.csv' });
  });

  afterEach(() => {
    teardownTestDb(ctx);
  });

  test('getSummaryStats returns non-zero totals', () => {
    const stats = getSummaryStats();
    assert.ok(stats.totalTx > 0);
    assert.ok(stats.totalIncome > 0);
    assert.ok(Math.abs(stats.totalExpense) > 0);
  });

  test('getMonthlySummary returns grouped by month', () => {
    const rows = getMonthlySummary();
    assert.ok(rows.length > 0);
    rows.forEach(r => {
      assert.match(r.month, /^\d{4}-\d{2}$/);
    });
  });

  test('getSpendingByCategory aggregates expenses', () => {
    const rows = getSpendingByCategory({ type: 'expense' });
    assert.ok(rows.length > 0);
    rows.forEach(r => {
      assert.ok(r.total >= 0, 'expense totals should be >= 0');
    });
  });

  test('getTopCounterparties returns limited list sorted by total', () => {
    const rows = getTopCounterparties({ limit: 5 });
    assert.equal(rows.length, 5);
    for (let i = 1; i < rows.length; i++) {
      assert.ok(rows[i].total <= rows[i - 1].total, 'should be sorted descending');
    }
  });

  test('getBalanceOverTime returns cumulative balance', () => {
    const rows = getBalanceOverTime();
    assert.ok(rows.length > 0);
    rows.forEach(r => assert.ok(typeof r.balance === 'number'));
  });

  test('getUncategorizedCount returns number', () => {
    const count = getUncategorizedCount();
    assert.equal(typeof count, 'number');
  });

  test('getKpiMetrics returns structured KPIs', () => {
    const stats = getKpiMetrics();
    assert.equal(typeof stats, 'object');
    assert.equal(typeof stats.balance, 'number');
    assert.equal(typeof stats.income, 'number');
    assert.equal(typeof stats.expense, 'number');
    assert.equal(typeof stats.incomeDelta, 'number');
    assert.equal(typeof stats.incomeDeltaPercent, 'number');
    assert.equal(typeof stats.expenseDelta, 'number');
    assert.equal(typeof stats.expenseDeltaPercent, 'number');
    assert.equal(typeof stats.transactionCount, 'number');
    assert.equal(stats.topCategory?.name !== undefined, true);
    assert.equal(stats.topCategory?.total !== undefined, true);
    assert.equal(typeof stats.prevPeriod, 'object');
    assert.equal(typeof stats.prevPeriod.from, 'string');
    assert.equal(typeof stats.prevPeriod.to, 'string');
    assert.equal(typeof stats.prevPeriod.income, 'number');
    assert.equal(typeof stats.prevPeriod.expense, 'number');
  });

  test('getIncomeExpenseOverTime returns grouped data', () => {
    const rows = getIncomeExpenseOverTime({ groupBy: 'month' });
    assert.ok(rows.length > 0);
    rows.forEach(r => {
      assert.ok(r.period);
      assert.equal(typeof r.income, 'number');
      assert.equal(typeof r.expense, 'number');
      assert.equal(typeof r.cumulative_balance, 'number');
    });
  });
});
