import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate } from '../src/web/public/js/utils.js';

describe('formatDate', () => {
  test('formats YYYY-MM-DD to DD.MM.YY', () => {
    assert.equal(formatDate('2024-05-23'), '23.05.24');
  });

  test('handles year boundary', () => {
    assert.equal(formatDate('1999-12-31'), '31.12.99');
  });

  test('returns empty string for null', () => {
    assert.equal(formatDate(null), '');
  });

  test('returns empty string for undefined', () => {
    assert.equal(formatDate(undefined), '');
  });

  test('returns empty string for empty string', () => {
    assert.equal(formatDate(''), '');
  });

  test('returns empty string for malformed input', () => {
    assert.equal(formatDate('not-a-date'), '');
  });

  test('handles ISO timestamp with time part', () => {
    assert.equal(formatDate('2024-05-23T10:30:00.000Z'), '23.05.24');
  });

  test('handles SQLite date format with space separator', () => {
    assert.equal(formatDate('2026-05-23 00:04:57'), '23.05.26');
  });
});
