import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAccountIdFromUrl } from '../src/web/public/js/account-filter.js';

describe('account-filter', () => {
  test('resolveAccountIdFromUrl uses URL param when present', () => {
    const url = new URL('http://localhost/?page=dashboard&accountId=42');
    assert.equal(resolveAccountIdFromUrl(url), '42');
  });

  test('resolveAccountIdFromUrl falls back to empty string when param missing', () => {
    const url = new URL('http://localhost/?page=dashboard');
    assert.equal(resolveAccountIdFromUrl(url), '');
  });

  test('resolveAccountIdFromUrl treats empty value as empty string', () => {
    const url = new URL('http://localhost/?accountId=');
    assert.equal(resolveAccountIdFromUrl(url), '');
  });

  test('resolveAccountIdFromUrl uses global location by default', () => {
    const originalLocation = globalThis.location;
    globalThis.location = new URL('http://localhost/?accountId=7');
    try {
      assert.equal(resolveAccountIdFromUrl(), '7');
    } finally {
      globalThis.location = originalLocation;
    }
  });
});
