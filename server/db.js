const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'qrfy.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS qrcodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  qr_type TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'dynamic', -- 'static' | 'dynamic'
  content_json TEXT NOT NULL,   -- raw form fields for the chosen type
  encoded_value TEXT NOT NULL,  -- the literal string encoded in a static code (kept for reference/editing)
  style_json TEXT NOT NULL,     -- colors, dot style, corners, logo, frame
  short_code TEXT UNIQUE,       -- only for dynamic codes
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qrcode_id INTEGER NOT NULL REFERENCES qrcodes(id) ON DELETE CASCADE,
  scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip TEXT,
  country TEXT,
  city TEXT,
  device TEXT,
  browser TEXT,
  os TEXT
);

CREATE TABLE IF NOT EXISTS feedback_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qrcode_id INTEGER NOT NULL REFERENCES qrcodes(id) ON DELETE CASCADE,
  answers_json TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrcodes_user ON qrcodes(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_qrcode ON scans(qrcode_id);
CREATE INDEX IF NOT EXISTS idx_scans_time ON scans(scanned_at);
`);

module.exports = db;
