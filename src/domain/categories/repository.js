import { getDb } from '../../config/database.js';

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
