-- Initial schema for Personal Leveling on Cloudflare D1 (SQLite)

PRAGMA foreign_keys = ON;

-- users (reserved for server-auth in a future phase)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- activities
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  duration_minutes INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- tasks (diárias/semanais/repetitivas)
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,     -- daily|weekly|repeatable
  title TEXT NOT NULL,
  status TEXT NOT NULL,   -- open|done|skipped
  reward_xp INTEGER DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- indexes
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, updated_at DESC);

