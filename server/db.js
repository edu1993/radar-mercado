const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const { getSources } = require('./config/sources');

function ensureStudyColumns(db) {
  const columns = db.prepare('PRAGMA table_info(studies)').all().map((col) => col.name);
  if (!columns.includes('notes')) {
    db.exec("ALTER TABLE studies ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
  }
  if (!columns.includes('is_favorite')) {
    db.exec('ALTER TABLE studies ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0');
  }
  if (!columns.includes('category_tag')) {
    db.exec("ALTER TABLE studies ADD COLUMN category_tag TEXT NOT NULL DEFAULT 'general'");
  }
}

function seedSourcesTable(db) {
  const upsert = db.prepare(`
    INSERT INTO sources (key, name, currency, region, active, status, max_limit, base_url)
    VALUES (@key, @name, @currency, @region, @active, @status, @maxLimit, @baseUrl)
    ON CONFLICT(key) DO UPDATE SET
      name = excluded.name,
      currency = excluded.currency,
      region = excluded.region,
      active = excluded.active,
      status = excluded.status,
      max_limit = excluded.max_limit,
      base_url = excluded.base_url
  `);

  for (const src of getSources()) {
    upsert.run({
      key: src.key,
      name: src.name,
      currency: src.currency,
      region: src.region,
      active: src.active ? 1 : 0,
      status: src.status,
      maxLimit: src.maxLimit,
      baseUrl: src.baseUrl
    });
  }
}

function cleanupExpiredSessions(db) {
  return db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now()).changes;
}

function initDatabase(dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'radar-mercado.sqlite')) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'ARS',
      region TEXT NOT NULL DEFAULT 'AR',
      active INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'planned',
      max_limit INTEGER NOT NULL DEFAULT 100,
      base_url TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS studies (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_key TEXT NOT NULL,
      source_name TEXT NOT NULL,
      term TEXT NOT NULL,
      term_normalized TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'ARS',
      total_products INTEGER NOT NULL,
      pages_read INTEGER NOT NULL DEFAULT 1,
      median_price REAL,
      mean_price REAL,
      min_price REAL,
      max_price REAL,
      notes TEXT NOT NULL DEFAULT '',
      is_favorite INTEGER NOT NULL DEFAULT 0,
      category_tag TEXT NOT NULL DEFAULT 'general',
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_studies_user_created ON studies(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_studies_cache ON studies(source_key, term_normalized, created_at DESC);

    CREATE TABLE IF NOT EXISTS assistant_messages (
      id TEXT PRIMARY KEY,
      study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  ensureStudyColumns(db);
  seedSourcesTable(db);
  cleanupExpiredSessions(db);

  return db;
}

module.exports = { initDatabase, cleanupExpiredSessions, seedSourcesTable };
