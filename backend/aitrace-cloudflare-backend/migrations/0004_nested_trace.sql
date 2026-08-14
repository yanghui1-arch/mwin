ALTER TABLE trace ADD COLUMN parent_trace_id TEXT;
CREATE INDEX IF NOT EXISTS idx_trace_parent ON trace(parent_trace_id);
