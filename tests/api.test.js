import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/web/server.js';
import { setupTestDb, teardownTestDb } from './_helper.js';
import { createCategory, createAccount, createCategoryRule } from '../src/core/repository.js';
import fs from 'node:fs';

const STATEMENT_PATH = './reports/Vpsk_71487962.csv';

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

  test('upload preview endpoint returns transactions without saving', async () => {
    const ctx = setupTestDb();
    const app = await buildApp();
    try {
      const buffer = fs.readFileSync(STATEMENT_PATH);
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      const payload = Buffer.concat([
        Buffer.from(`--${boundary}\r\n`),
        Buffer.from('Content-Disposition: form-data; name="file"; filename="test.csv"\r\n'),
        Buffer.from('Content-Type: text/csv\r\n\r\n'),
        buffer,
        Buffer.from(`\r\n--${boundary}--\r\n`)
      ]);
      const res = await app.inject({
        method: 'POST',
        url: '/api/upload/preview',
        payload,
        headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(Array.isArray(body.transactions));
      assert.ok(body.transactions.length > 0);
    } finally {
      await app.close();
      teardownTestDb(ctx);
    }
  });
});

describe('Category Rules API', () => {
  test('CRUD category rules', async () => {
    const ctx = setupTestDb();
    const app = await buildApp();
    try {
      const cat = createCategory({ name: 'TestCat', color: '#ef4444' });
      const acc = createAccount({ accountNumber: '1234', name: 'TestAcc' });

      // Create
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/category-rules',
        payload: {
          categoryId: cat.id,
          descriptionPattern: 'ATB',
          minAmount: 100,
          maxAmount: 500,
          accountId: acc.id,
          currency: 'BYN',
          priority: 5,
          isActive: true
        }
      });
      assert.equal(createRes.statusCode, 200);
      const rule = JSON.parse(createRes.payload);
      assert.equal(rule.categoryId, cat.id);
      assert.equal(rule.descriptionPattern, 'ATB');
      assert.equal(rule.minAmount, 100);
      assert.equal(rule.maxAmount, 500);
      assert.equal(rule.accountId, acc.id);
      assert.equal(rule.currency, 'BYN');
      assert.equal(rule.priority, 5);
      assert.equal(rule.isActive, 1);

      // List
      const listRes = await app.inject({ method: 'GET', url: '/api/category-rules' });
      assert.equal(listRes.statusCode, 200);
      const listBody = JSON.parse(listRes.payload);
      assert.equal(listBody.rules.length, 1);

      // Update
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/category-rules/${rule.id}`,
        payload: {
          categoryId: cat.id,
          descriptionPattern: 'Evroopt',
          minAmount: null,
          maxAmount: null,
          accountId: null,
          currency: null,
          priority: 10,
          isActive: false
        }
      });
      assert.equal(updateRes.statusCode, 200);
      const updated = JSON.parse(updateRes.payload);
      assert.equal(updated.descriptionPattern, 'Evroopt');
      assert.equal(updated.isActive, 0);

      // Delete
      const delRes = await app.inject({ method: 'DELETE', url: `/api/category-rules/${rule.id}` });
      assert.equal(delRes.statusCode, 200);

      const listAfter = await app.inject({ method: 'GET', url: '/api/category-rules' });
      const afterBody = JSON.parse(listAfter.payload);
      assert.equal(afterBody.rules.length, 0);
    } finally {
      await app.close();
      teardownTestDb(ctx);
    }
  });
});

describe('Upload Preview & Confirm API', () => {
  test('preview returns transactions with applied rules', async () => {
    const ctx = setupTestDb();
    const app = await buildApp();
    try {
      const cat = createCategory({ name: 'Groceries', color: '#22c55e' });
      createCategoryRule({
        categoryId: cat.id,
        descriptionPattern: 'ATB',
        minAmount: null,
        maxAmount: null,
        accountId: null,
        currency: null,
        priority: 1,
        isActive: true
      });

      const buffer = fs.readFileSync(STATEMENT_PATH);
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      const payload = Buffer.concat([
        Buffer.from(`--${boundary}\r\n`),
        Buffer.from('Content-Disposition: form-data; name="file"; filename="test.csv"\r\n'),
        Buffer.from('Content-Type: text/csv\r\n\r\n'),
        buffer,
        Buffer.from(`\r\n--${boundary}--\r\n`)
      ]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/upload/preview',
        payload,
        headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(Array.isArray(body.transactions));
      assert.ok(body.transactions.length > 0);
      assert.ok(typeof body.stats.newCount === 'number');
      assert.ok(typeof body.stats.duplicateCount === 'number');

      // Check that some transactions have appliedRuleId when matching
      const atbTx = body.transactions.find(t => t.description && t.description.toLowerCase().includes('атб'));
      if (atbTx) {
        assert.ok(atbTx.appliedRuleId !== null, 'ATB transaction should have appliedRuleId');
        assert.equal(atbTx.finalCategoryId, cat.id);
      }
    } finally {
      await app.close();
      teardownTestDb(ctx);
    }
  });

  test('confirm import saves transactions', async () => {
    const ctx = setupTestDb();
    const app = await buildApp();
    try {
      const buffer = fs.readFileSync(STATEMENT_PATH);
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      const payload = Buffer.concat([
        Buffer.from(`--${boundary}\r\n`),
        Buffer.from('Content-Disposition: form-data; name="file"; filename="test.csv"\r\n'),
        Buffer.from('Content-Type: text/csv\r\n\r\n'),
        buffer,
        Buffer.from(`\r\n--${boundary}--\r\n`)
      ]);

      const previewRes = await app.inject({
        method: 'POST',
        url: '/api/upload/preview',
        payload,
        headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }
      });
      const previewBody = JSON.parse(previewRes.payload);

      const confirmRes = await app.inject({
        method: 'POST',
        url: '/api/upload/confirm',
        payload: {
          transactions: previewBody.transactions,
          originalFilename: previewBody.originalFilename
        }
      });
      assert.equal(confirmRes.statusCode, 200);
      const confirmBody = JSON.parse(confirmRes.payload);
      assert.ok(confirmBody.imported > 0);
      assert.equal(confirmBody.duplicatesSkipped, 0);
    } finally {
      await app.close();
      teardownTestDb(ctx);
    }
  });
});
