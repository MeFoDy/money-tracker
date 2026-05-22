import { getRules, updateTransactionCategory } from './repository.js';

export function suggest(description) {
  if (!description) return null;
  const rules = getRules();
  const lowerDesc = description.toLowerCase();
  for (const rule of rules) {
    if (lowerDesc.includes(rule.pattern.toLowerCase())) {
      return rule.category_id;
    }
  }
  return null;
}

export function learn(transactionId, categoryId) {
  return updateTransactionCategory(transactionId, categoryId);
}

export { bulkUpdateCategory } from './repository.js';