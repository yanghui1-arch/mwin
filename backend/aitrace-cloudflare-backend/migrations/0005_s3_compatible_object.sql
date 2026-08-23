CREATE TABLE s3_compatible_object (
  object_key TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  content_encoding TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  raw_size_bytes INTEGER NOT NULL,
  stored_size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE step ADD COLUMN payload_object_key TEXT
  REFERENCES s3_compatible_object(object_key);
ALTER TABLE trace ADD COLUMN payload_object_key TEXT
  REFERENCES s3_compatible_object(object_key);
