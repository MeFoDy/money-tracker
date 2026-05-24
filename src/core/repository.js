import { getDb } from './db.js';

function nextDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

/* ---------- Accounts ---------- */
export function createAccount({ accountNumber, name, currency = 'BYN' }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO accounts (account_number, name, currency)
    VALUES (?, ?, ?)
    ON CONFLICT(account_number) DO UPDATE SET name=excluded.name
    RETURNING *
  `);
  return stmt.get(accountNumber, name, currency);
}

export function getAccountByNumber(accountNumber) {
  return getDb().prepare('SELECT * FROM accounts WHERE account_number = ?').get(accountNumber);
}

export function getAllAccounts() {
  return getDb().prepare('SELECT * FROM accounts ORDER BY created_at DESC').all();
}

/* ---------- Categories ---------- */
export function createCategory({ name, color }) {
  const stmt = getDb().prepare('INSERT INTO categories (name, color) VALUES (?, ?) RETURNING *');
  return stmt.get(name, color);
}

export function getCategoryByName(name) {
  return getDb().prepare('SELECT * FROM categories WHERE name = ?').get(name);
}

export function getAllCategories() {
  return getDb().prepare('SELECT * FROM categories ORDER BY name').all();
}

export function updateCategory(id, { name, color }) {
  const stmt = getDb().prepare('UPDATE categories SET name = ?, color = ? WHERE id = ? RETURNING *');
  return stmt.get(name, color, id);
}

export function deleteCategory(id) {
  getDb().prepare('DELETE FROM categories WHERE id = ?').run(id);
}

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

/* ---------- Transactions ---------- */
export function createTransaction({ accountId, categoryId, txDate, description, amount, amountByn, currency, txType, txHash, bankCategory, isPending = 0 }) {
  const stmt = getDb().prepare(`
    INSERT INTO transactions (account_id, category_id, tx_date, description, amount, amount_byn, currency, tx_type, tx_hash, bank_category, is_pending)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tx_hash) DO NOTHING
    RETURNING *
  `);
  return stmt.get(accountId, categoryId, txDate, description, amount, amountByn, currency, txType, txHash, bankCategory, isPending);
}

export function getTransactionByHash(txHash) {
  return getDb().prepare('SELECT * FROM transactions WHERE tx_hash = ?').get(txHash);
}

export function updateTransactionCategory(id, categoryId) {
  const stmt = getDb().prepare('UPDATE transactions SET category_id = ? WHERE id = ? RETURNING *');
  return stmt.get(categoryId, id);
}

export function bulkUpdateCategory(ids, categoryId) {
  const db = getDb();
  const stmt = db.prepare('UPDATE transactions SET category_id = ? WHERE id = ?');
  const updateMany = db.transaction((ids) => {
    for (const id of ids) stmt.run(categoryId, id);
  });
  updateMany(ids);
}

export function updatePendingToCompleted(txHash, { categoryId, amount, amountByn, bankCategory }) {
  const stmt = getDb().prepare(`
    UPDATE transactions
    SET is_pending = 0, category_id = COALESCE(?, category_id), amount = ?, amount_byn = ?, bank_category = COALESCE(?, bank_category)
    WHERE tx_hash = ?
    RETURNING *
  `);
  return stmt.get(categoryId, amount, amountByn, bankCategory, txHash);
}

/* ---------- Filtering ---------- */
export function getTransactions({ from, to, accountId, categoryId, search, isPending, limit = 50, offset = 0, orderBy = 'tx_date DESC' } = {}) {
  const conditions = [];
  const params = [];

  if (from) { conditions.push('tx_date >= ?'); params.push(from.slice(0, 10)); }
  if (to) { conditions.push('tx_date < ?'); params.push(nextDay(to.slice(0, 10))); }
  if (accountId) { conditions.push('account_id = ?'); params.push(accountId); }
  if (categoryId !== undefined) {
    if (categoryId === null) conditions.push('category_id IS NULL');
    else { conditions.push('category_id = ?'); params.push(categoryId); }
  }
  if (isPending !== undefined) { conditions.push('is_pending = ?'); params.push(isPending ? 1 : 0); }
  if (search) { conditions.push('description LIKE ?'); params.push(`%${search}%`); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countStmt = getDb().prepare(`SELECT COUNT(*) as total FROM transactions ${where}`);
  const dataStmt = getDb().prepare(`SELECT * FROM transactions ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`);

  params.push(limit, offset);
  const rows = dataStmt.all(...params);
  const total = countStmt.get(...params.slice(0, -2)).total;
  return { rows, total, limit, offset };
}

/* ---------- Uploads ---------- */
export function createUpload({ filename, importedCount, duplicatesSkipped, updatedFromPending }) {
  const stmt = getDb().prepare(`
    INSERT INTO uploads (filename, imported_count, duplicates_skipped, updated_from_pending)
    VALUES (?, ?, ?, ?)
    RETURNING *
  `);
  return stmt.get(filename, importedCount, duplicatesSkipped, updatedFromPending);
}

/* ---------- Pending Transactions ---------- */
export function createPending({ accountId, txDate, description, amount, amountByn, currency, txHash, bankCategory }) {
  const stmt = getDb().prepare(`
    INSERT INTO pending_transactions (account_id, tx_date, description, amount, amount_byn, currency, tx_hash, bank_category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tx_hash) DO NOTHING
    RETURNING *
  `);
  return stmt.get(accountId, txDate, description, amount, amountByn, currency, txHash, bankCategory);
}

export function getPendingByHash(txHash) {
  return getDb().prepare('SELECT * FROM pending_transactions WHERE tx_hash = ?').get(txHash);
}
