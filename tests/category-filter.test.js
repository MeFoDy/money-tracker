import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCategoryIdsFromUrl } from '../src/web/public/js/category-filter.js';

describe('category-filter', () => {
  test('resolveCategoryIdsFromUrl uses URL param when present', () => {
    const url = new URL('http://localhost/?page=dashboard&categoryIds=1,2,3');
    assert.deepEqual(resolveCategoryIdsFromUrl(url), ['1', '2', '3']);
  });

  test('resolveCategoryIdsFromUrl preserves null sentinel for uncategorized', () => {
    const url = new URL('http://localhost/?categoryIds=null,1');
    assert.deepEqual(resolveCategoryIdsFromUrl(url), ['null', '1']);
  });

  test('resolveCategoryIdsFromUrl falls back to empty array when param missing', () => {
    const url = new URL('http://localhost/?page=dashboard');
    assert.deepEqual(resolveCategoryIdsFromUrl(url), []);
  });

  test('resolveCategoryIdsFromUrl treats empty value as empty array', () => {
    const url = new URL('http://localhost/?categoryIds=');
    assert.deepEqual(resolveCategoryIdsFromUrl(url), []);
  });

  test('resolveCategoryIdsFromUrl uses global location by default', () => {
    const originalLocation = globalThis.location;
    globalThis.location = new URL('http://localhost/?categoryIds=7,null');
    try {
      assert.deepEqual(resolveCategoryIdsFromUrl(), ['7', 'null']);
    } finally {
      globalThis.location = originalLocation;
    }
  });
});
