CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT NOT NULL,
  avatar TEXT,
  register_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_auth (
  id TEXT PRIMARY KEY,
  user_uuid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  auth_type TEXT NOT NULL,
  identifier TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_key (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL UNIQUE,
  created_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_uuid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  strategy TEXT,
  avg_duration INTEGER NOT NULL DEFAULT 0,
  cost TEXT NOT NULL DEFAULT '0.0000000000',
  created_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_update_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_uuid, name)
);

CREATE TABLE IF NOT EXISTS trace (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  tags TEXT NOT NULL,
  input TEXT,
  output TEXT,
  error_info TEXT,
  start_time TEXT NOT NULL,
  last_update_timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS step (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trace_id TEXT,
  parent_step_id TEXT,
  type TEXT NOT NULL,
  tags TEXT NOT NULL,
  input TEXT,
  output TEXT,
  error_info TEXT,
  model TEXT,
  usage TEXT,
  project_name TEXT NOT NULL,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT
);

CREATE TABLE IF NOT EXISTS step_meta (
  id TEXT PRIMARY KEY REFERENCES step(id) ON DELETE CASCADE,
  metadata TEXT,
  cost TEXT NOT NULL DEFAULT '0.0000000000'
);

CREATE TABLE IF NOT EXISTS media_asset (
  id TEXT PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_user ON project(user_uuid);
CREATE INDEX IF NOT EXISTS idx_trace_project ON trace(project_id);
CREATE INDEX IF NOT EXISTS idx_step_project_start ON step(project_id, start_time);
CREATE INDEX IF NOT EXISTS idx_step_trace ON step(trace_id);
CREATE INDEX IF NOT EXISTS idx_api_key_key ON api_key(key);
