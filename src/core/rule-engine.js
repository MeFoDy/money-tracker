/**
 * Pure rule engine for auto-categorizing transactions during import.
 * No database dependencies.
 */

/**
 * Check if a single transaction matches a single rule.
 * All specified rule fields must match (AND logic).
 * @param {object} tx - Transaction object with: description, amount, accountId, currency
 * @param {object} rule - Rule object with: descriptionPattern, minAmount, maxAmount, accountId, currency
 * @returns {boolean}
 */
export function matches(tx, rule) {
  if (rule.descriptionPattern !== undefined && rule.descriptionPattern !== null) {
    const pattern = String(rule.descriptionPattern).toLowerCase();
    const desc = String(tx.description || '').toLowerCase();
    if (!desc.includes(pattern)) {
      return false;
    }
  }

  if (rule.minAmount !== undefined && rule.minAmount !== null && Number(tx.amount) < Number(rule.minAmount)) {
    return false;
  }

  if (rule.maxAmount !== undefined && rule.maxAmount !== null && Number(tx.amount) > Number(rule.maxAmount)) {
    return false;
  }

  if (rule.accountId !== undefined && rule.accountId !== null && Number(tx.accountId) !== Number(rule.accountId)) {
    return false;
  }

  if (rule.currency !== undefined && rule.currency !== null && String(tx.currency || '').toUpperCase() !== String(rule.currency).toUpperCase()) {
    return false;
  }

  return true;
}

/**
 * Apply sorted rules to a transaction and return the first matching rule.
 * Rules must be pre-sorted by priority DESC, id ASC.
 * @param {object} tx
 * @param {object[]} rules
 * @returns {object|null} - The matching rule or null
 */
export function applyRules(tx, rules) {
  for (const rule of rules) {
    if (matches(tx, rule)) return rule;
  }
  return null;
}
