import { describe, it } from 'node:test';
import assert from 'node:assert';
import { matches, applyRules } from '../src/core/rule-engine.js';

describe('rule-engine', () => {
  describe('matches', () => {
    it('matches by description pattern (case-insensitive)', () => {
      assert.strictEqual(matches({ description: 'Покупка в АТБ' }, { descriptionPattern: 'атб' }), true);
      assert.strictEqual(matches({ description: 'Покупка в АТБ' }, { descriptionPattern: 'АТБ' }), true);
      assert.strictEqual(matches({ description: 'Покупка в АТБ' }, { descriptionPattern: 'магазин' }), false);
    });

    it('matches by minAmount', () => {
      assert.strictEqual(matches({ amount: 100 }, { minAmount: 50 }), true);
      assert.strictEqual(matches({ amount: 30 }, { minAmount: 50 }), false);
      assert.strictEqual(matches({ amount: 50 }, { minAmount: 50 }), true);
    });

    it('matches by maxAmount', () => {
      assert.strictEqual(matches({ amount: 10 }, { maxAmount: 20 }), true);
      assert.strictEqual(matches({ amount: 25 }, { maxAmount: 20 }), false);
      assert.strictEqual(matches({ amount: 20 }, { maxAmount: 20 }), true);
    });

    it('matches by amount range', () => {
      assert.strictEqual(matches({ amount: 15 }, { minAmount: 10, maxAmount: 20 }), true);
      assert.strictEqual(matches({ amount: 5 }, { minAmount: 10, maxAmount: 20 }), false);
      assert.strictEqual(matches({ amount: 25 }, { minAmount: 10, maxAmount: 20 }), false);
    });

    it('matches by accountId', () => {
      assert.strictEqual(matches({ accountId: 3 }, { accountId: 3 }), true);
      assert.strictEqual(matches({ accountId: 3 }, { accountId: 4 }), false);
    });

    it('matches by currency (case-insensitive)', () => {
      assert.strictEqual(matches({ currency: 'BYN' }, { currency: 'byn' }), true);
      assert.strictEqual(matches({ currency: 'USD' }, { currency: 'BYN' }), false);
    });

    it('matches with multiple conditions (AND)', () => {
      const rule = { descriptionPattern: 'атб', minAmount: 100, currency: 'BYN' };
      assert.strictEqual(matches({ description: 'Покупка в АТБ', amount: 150, currency: 'BYN' }, rule), true);
      assert.strictEqual(matches({ description: 'Покупка в АТБ', amount: 50, currency: 'BYN' }, rule), false);
      assert.strictEqual(matches({ description: 'Покупка в АТБ', amount: 150, currency: 'USD' }, rule), false);
      assert.strictEqual(matches({ description: 'Покупка в Евроопт', amount: 150, currency: 'BYN' }, rule), false);
    });

    it('matches when rule has no conditions', () => {
      assert.strictEqual(matches({ description: 'anything', amount: 999 }, {}), true);
    });

    it('ignores null/undefined rule fields', () => {
      const rule = { descriptionPattern: null, minAmount: undefined, maxAmount: 100 };
      assert.strictEqual(matches({ description: 'anything', amount: 50 }, rule), true);
      assert.strictEqual(matches({ description: 'anything', amount: 150 }, rule), false);
    });

    it('does not match all transactions when only descriptionPattern is set', () => {
      const rule = { descriptionPattern: 'ENDEL SUBSCRIPTION', minAmount: null, maxAmount: null };
      assert.strictEqual(matches({ description: 'ENDEL SUBSCRIPTION', amount: 100 }, rule), true);
      assert.strictEqual(matches({ description: 'Grocery store', amount: 50 }, rule), false);
    });

    it('respects zero amount bounds when explicitly set', () => {
      const rule = { descriptionPattern: 'ENDEL SUBSCRIPTION', minAmount: 0, maxAmount: 0 };
      assert.strictEqual(matches({ description: 'ENDEL SUBSCRIPTION', amount: 0 }, rule), true);
      assert.strictEqual(matches({ description: 'ENDEL SUBSCRIPTION', amount: 100 }, rule), false);
      assert.strictEqual(matches({ description: 'Grocery store', amount: 0 }, rule), false);
    });
  });

  describe('applyRules', () => {
    it('returns first matching rule in order', () => {
      const rules = [
        { id: 1, descriptionPattern: 'атб', priority: 10 },
        { id: 2, descriptionPattern: 'атб', priority: 5 },
      ];
      const result = applyRules({ description: 'Покупка в АТБ' }, rules);
      assert.strictEqual(result.id, 1);
    });

    it('returns null when no rules match', () => {
      const rules = [{ id: 1, descriptionPattern: 'атб' }];
      const result = applyRules({ description: 'Покупка в Евроопт' }, rules);
      assert.strictEqual(result, null);
    });

    it('returns null for empty rules array', () => {
      const result = applyRules({ description: 'anything' }, []);
      assert.strictEqual(result, null);
    });
  });
});
