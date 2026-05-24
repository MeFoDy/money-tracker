import { getDb } from '../../config/database.js';

/* ---------- Category Rules ---------- */
function mapCategoryRuleRow(r) {
  return {
    id: r.id,
    categoryId: r.category_id,
    categoryName: r.category_name,
    categoryColor: r.category_color,
    accountNumber: r.account_number,
    accountName: r.account_name,
    descriptionPattern: r.description_pattern,
    minAmount: r.min_amount,
    maxAmount: r.max_amount,
    accountId: r.account_id,
    currency: r.currency,
    priority: r.priority,
    isActive: r.is_active,
    createdAt: r.created_at
  };
}

export function createCategoryRule({ categoryId, descriptionPattern, minAmount, maxAmount, accountId, currency, priority, isActive }) {
  const stmt = getDb().prepare(`
    INSERT INTO category_rules (category_id, description_pattern, min_amount, max_amount, account_id, currency, priority, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `);
  const row = stmt.get(categoryId, descriptionPattern || null, minAmount ?? null, maxAmount ?? null, accountId || null, currency || null, priority ?? 0, isActive ? 1 : 0);
  return mapCategoryRuleRow(row);
}

export function getAllCategoryRules() {
  const rows = getDb().prepare(`
    SELECT r.*, c.name as category_name, c.color as category_color, a.account_number, a.name as account_name
    FROM category_rules r
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN accounts a ON r.account_id = a.id
    ORDER BY r.priority DESC, r.id ASC
  `).all();
  return rows.map((r) => mapCategoryRuleRow(r));
}

export function getActiveCategoryRules() {
  const rows = getDb().prepare(`
    SELECT r.*, c.name as category_name
    FROM category_rules r
    JOIN categories c ON r.category_id = c.id
    WHERE r.is_active = 1
    ORDER BY r.priority DESC, r.id ASC
  `).all();
  return rows.map((r) => mapCategoryRuleRow(r));
}

export function updateCategoryRule(id, { categoryId, descriptionPattern, minAmount, maxAmount, accountId, currency, priority, isActive }) {
  const stmt = getDb().prepare(`
    UPDATE category_rules
    SET category_id = ?, description_pattern = ?, min_amount = ?, max_amount = ?, account_id = ?, currency = ?, priority = ?, is_active = ?
    WHERE id = ?
    RETURNING *
  `);
  const row = stmt.get(categoryId, descriptionPattern || null, minAmount ?? null, maxAmount ?? null, accountId || null, currency || null, priority ?? 0, isActive ? 1 : 0, id);
  return row ? mapCategoryRuleRow(row) : null;
}

export function deleteCategoryRule(id) {
  getDb().prepare('DELETE FROM category_rules WHERE id = ?').run(id);
}
