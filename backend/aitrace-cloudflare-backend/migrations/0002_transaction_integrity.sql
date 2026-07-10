-- Store monetary aggregates as fixed-point integers so D1 can update them atomically.
-- Existing display columns remain for API compatibility and are synchronized by write paths.
ALTER TABLE project ADD COLUMN cost_units INTEGER NOT NULL DEFAULT 0;
ALTER TABLE step_meta ADD COLUMN cost_units INTEGER NOT NULL DEFAULT 0;

UPDATE project
SET cost_units = CAST(ROUND(CAST(cost AS REAL) * 10000000000) AS INTEGER);

UPDATE step_meta
SET cost_units = CAST(ROUND(CAST(cost AS REAL) * 10000000000) AS INTEGER);
