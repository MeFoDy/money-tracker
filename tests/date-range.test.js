import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultDateRange, resolveDateRangeFromUrl, computePeriodRange } from '../src/web/public/js/date-range.js';

describe('date-range', () => {
  test('getDefaultDateRange returns from first day of two months ago to today', () => {
    const now = new Date();
    const { from, to } = getDefaultDateRange();
    const expectedTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const expectedFrom = (() => {
      const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    assert.equal(to, expectedTo);
    assert.equal(from, expectedFrom);
    assert.match(from, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(to, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('resolveDateRangeFromUrl uses URL params when present', () => {
    const url = new URL('http://localhost/?from=2026-01-15&to=2026-06-20');
    const range = resolveDateRangeFromUrl(url);
    assert.deepEqual(range, { from: '2026-01-15', to: '2026-06-20' });
  });

  test('resolveDateRangeFromUrl falls back to defaults when params missing', () => {
    const url = new URL('http://localhost/?page=dashboard');
    const range = resolveDateRangeFromUrl(url);
    const defaults = getDefaultDateRange();
    assert.deepEqual(range, defaults);
  });

  test('resolveDateRangeFromUrl falls back partially when only from is present', () => {
    const url = new URL('http://localhost/?from=2026-01-01');
    const range = resolveDateRangeFromUrl(url);
    const defaults = getDefaultDateRange();
    assert.equal(range.from, '2026-01-01');
    assert.equal(range.to, defaults.to);
  });

  test('computePeriodRange returns month range', async () => {
    const range = await computePeriodRange('month', async () => ({ min: '2020-01-01', max: '2026-12-31' }));
    assert.match(range.from, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(range.to, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(range.from < range.to);
  });

  test('computePeriodRange returns all-time range from fetcher', async () => {
    const range = await computePeriodRange('all', async () => ({ min: '2020-01-01', max: '2026-12-31' }));
    assert.deepEqual(range, { from: '2020-01-01', to: '2026-12-31' });
  });

  test('computePeriodRange throws for custom period', async () => {
    await assert.rejects(() => computePeriodRange('custom', async () => ({ min: '', max: '' })), /should not be called for custom period/);
  });
});
