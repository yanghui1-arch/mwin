-- The per-trace step count in TraceRepository.findByProjectId correlates on
-- step.trace_id; give it an index mirroring the Cloudflare D1 schema.
CREATE INDEX IF NOT EXISTS idx_step_trace ON step(trace_id);
