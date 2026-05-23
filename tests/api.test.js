import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/web/server.js';
import { setupTestDb, teardownTestDb } from './_helper.js';

describe('API', () => {
  test('analytics summary endpoint', async () => {
    const ctx = setupTestDb();
    const app = await buildApp();
    try {
      const res = await app.inject({ method: 'GET', url: '/api/analytics/summary' });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(typeof body.totalTx, 'number');
    } finally {
      await app.close();
      teardownTestDb(ctx);
    }
  });

  test('categories endpoint returns list', async () => {
    const ctx = setupTestDb();
    const app = await buildApp();
    try {
      const res = await app.inject({ method: 'GET', url: '/api/categories' });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(Array.isArray(body.categories));
    } finally {
      await app.close();
      teardownTestDb(ctx);
    }
  });

  test('index page loads with required frontend assets', async () => {
    const ctx = setupTestDb();
    const app = await buildApp();
    try {
      const res = await app.inject({ method: 'GET', url: '/' });
      assert.equal(res.statusCode, 200);
      assert.ok(res.payload.includes('chart.js'));
      assert.ok(res.payload.includes('app.js'));
      assert.ok(res.payload.includes('alpinejs.js'));
    } finally {
      await app.close();
      teardownTestDb(ctx);
    }
  });
});
