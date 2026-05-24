import { getDb } from '../../config/database.js';

/* ---------- Uploads ---------- */
export function createUpload({ filename, importedCount, duplicatesSkipped, updatedFromPending }) {
  const stmt = getDb().prepare(`
    INSERT INTO uploads (filename, imported_count, duplicates_skipped, updated_from_pending)
    VALUES (?, ?, ?, ?)
    RETURNING *
  `);
  return stmt.get(filename, importedCount, duplicatesSkipped, updatedFromPending);
}
