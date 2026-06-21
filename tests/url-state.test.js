import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeDateRangeToUrl, writeAccountIdToUrl, replaceDateRangeInUrl, replaceAccountIdInUrl, pushDateRangeToUrl, pushAccountIdToUrl, buildPageUrl } from '../src/web/public/js/url-state.js';

describe('url-state', () => {
  let originalLocation;
  let pushed = [];
  let replaced = [];

  beforeEach(() => {
    originalLocation = globalThis.location;
    globalThis.location = new URL('http://localhost/?page=dashboard&from=2026-01-01&to=2026-03-31');
    pushed = [];
    replaced = [];
    globalThis.history = {
      pushState: (_state, _title, url) => pushed.push(url),
      replaceState: (_state, _title, url) => replaced.push(url)
    };
  });

  afterEach(() => {
    globalThis.location = originalLocation;
    delete globalThis.history;
  });

  test('writeDateRangeToUrl sets from and to', () => {
    const url = new URL('http://localhost/');
    writeDateRangeToUrl(url, { from: '2026-05-01', to: '2026-05-31' });
    assert.equal(url.searchParams.get('from'), '2026-05-01');
    assert.equal(url.searchParams.get('to'), '2026-05-31');
  });

  test('writeDateRangeToUrl deletes empty values', () => {
    const url = new URL('http://localhost/?from=2026-01-01&to=2026-03-31');
    writeDateRangeToUrl(url, { from: '', to: '' });
    assert.equal(url.searchParams.has('from'), false);
    assert.equal(url.searchParams.has('to'), false);
  });

  test('writeAccountIdToUrl sets accountId', () => {
    const url = new URL('http://localhost/');
    writeAccountIdToUrl(url, '42');
    assert.equal(url.searchParams.get('accountId'), '42');
  });

  test('writeAccountIdToUrl deletes empty value', () => {
    const url = new URL('http://localhost/?accountId=42');
    writeAccountIdToUrl(url, '');
    assert.equal(url.searchParams.has('accountId'), false);
  });

  test('pushDateRangeToUrl creates a history entry with current location', () => {
    pushDateRangeToUrl({ from: '2026-06-01', to: '2026-06-30' });
    assert.equal(pushed.length, 1);
    assert.equal(typeof pushed[0], 'string');
    const pushedUrl = new URL(pushed[0]);
    assert.equal(pushedUrl.searchParams.get('from'), '2026-06-01');
    assert.equal(pushedUrl.searchParams.get('to'), '2026-06-30');
    assert.equal(pushedUrl.searchParams.get('page'), 'dashboard');
  });

  test('pushAccountIdToUrl creates a history entry with accountId', () => {
    pushAccountIdToUrl('42');
    assert.equal(pushed.length, 1);
    const pushedUrl = new URL(pushed[0]);
    assert.equal(pushedUrl.searchParams.get('accountId'), '42');
    assert.equal(pushedUrl.searchParams.get('page'), 'dashboard');
  });

  test('replaceDateRangeInUrl replaces current history entry', () => {
    replaceDateRangeInUrl({ from: '2026-04-01', to: '2026-04-30' });
    assert.equal(replaced.length, 1);
    assert.equal(typeof replaced[0], 'string');
    assert.ok(replaced[0].includes('from=2026-04-01'));
  });

  test('replaceAccountIdInUrl replaces current history entry', () => {
    replaceAccountIdInUrl('7');
    assert.equal(replaced.length, 1);
    const replacedUrl = new URL(replaced[0]);
    assert.equal(replacedUrl.searchParams.get('accountId'), '7');
  });

  test('buildPageUrl preserves date range and account filter and switches page', () => {
    const url = buildPageUrl('transactions', { from: '2026-01-01', to: '2026-03-31', accountId: '42' });
    assert.equal(url.searchParams.get('page'), 'transactions');
    assert.equal(url.searchParams.get('from'), '2026-01-01');
    assert.equal(url.searchParams.get('to'), '2026-03-31');
    assert.equal(url.searchParams.get('accountId'), '42');
    assert.equal(url.searchParams.has('period'), false);
  });

  test('buildPageUrl clears missing accountId', () => {
    globalThis.location = new URL('http://localhost/?page=dashboard&accountId=42');
    const url = buildPageUrl('transactions', { from: '2026-01-01', to: '2026-03-31', accountId: '' });
    assert.equal(url.searchParams.has('accountId'), false);
  });
});
