DELETE FROM step_meta
WHERE id IN (
  SELECT id FROM step WHERE payload_object_key IS NULL
);

DELETE FROM step WHERE payload_object_key IS NULL;
DELETE FROM trace WHERE payload_object_key IS NULL;

PRAGMA defer_foreign_keys = ON;

CREATE TABLE trace_0006_new (
  id TEXT PRIMARY KEY,
  parent_trace_id TEXT,
  project_name TEXT NOT NULL,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  tags TEXT NOT NULL,
  payload_object_key TEXT NOT NULL REFERENCES s3_compatible_object(object_key),
  error_info TEXT,
  start_time TEXT NOT NULL,
  last_update_timestamp TEXT NOT NULL
);

INSERT INTO trace_0006_new (
  id, parent_trace_id, project_name, project_id, name, conversation_id, tags,
  payload_object_key, error_info, start_time, last_update_timestamp
)
SELECT
  id, parent_trace_id, project_name, project_id, name, conversation_id, tags,
  payload_object_key, error_info, start_time, last_update_timestamp
FROM trace;

CREATE TABLE step_0006_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trace_id TEXT,
  parent_step_id TEXT,
  type TEXT NOT NULL,
  tags TEXT NOT NULL,
  payload_object_key TEXT NOT NULL REFERENCES s3_compatible_object(object_key),
  error_info TEXT,
  model TEXT,
  usage TEXT,
  project_name TEXT NOT NULL,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT
);

INSERT INTO step_0006_new (
  id, name, trace_id, parent_step_id, type, tags, payload_object_key,
  error_info, model, usage, project_name, project_id, start_time, end_time
)
SELECT
  id, name, trace_id, parent_step_id, type, tags, payload_object_key,
  error_info, model, usage, project_name, project_id, start_time, end_time
FROM step;

CREATE TABLE step_meta_0006_backup AS
SELECT id, metadata, cost, cost_units FROM step_meta;

DROP TABLE step_meta;
DROP TABLE step;
DROP TABLE trace;

ALTER TABLE step_0006_new RENAME TO step;
ALTER TABLE trace_0006_new RENAME TO trace;

CREATE TABLE step_meta (
  id TEXT PRIMARY KEY REFERENCES step(id) ON DELETE CASCADE,
  metadata TEXT,
  cost TEXT NOT NULL DEFAULT '0.0000000000',
  cost_units INTEGER NOT NULL DEFAULT 0
);

INSERT INTO step_meta (id, metadata, cost, cost_units)
SELECT id, metadata, cost, cost_units FROM step_meta_0006_backup;

DROP TABLE step_meta_0006_backup;

CREATE INDEX idx_trace_project ON trace(project_id);
CREATE INDEX idx_trace_parent ON trace(parent_trace_id);
CREATE INDEX idx_step_project_start ON step(project_id, start_time);
CREATE INDEX idx_step_trace ON step(trace_id);

PRAGMA defer_foreign_keys = OFF;
