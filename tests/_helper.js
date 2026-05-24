import { getDb, closeDb } from '../src/config/database.js';
import { rmSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export function setupTestDb() {
  const dir = mkdtempSync(path.join(tmpdir(), 'money-tracker-test-'));
  const dbPath = path.join(dir, 'test.db');
  process.env.DB_PATH = dbPath;
  // Force new DB instance
  closeDb();
  getDb();
  return { dir, dbPath };
}

export function teardownTestDb({ dir }) {
  closeDb();
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}
