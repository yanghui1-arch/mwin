DELETE FROM step_meta
WHERE id IN (
    SELECT id FROM step WHERE payload_object_key IS NULL
);

DELETE FROM step WHERE payload_object_key IS NULL;
DELETE FROM trace WHERE payload_object_key IS NULL;

ALTER TABLE step
    DROP COLUMN input,
    DROP COLUMN output,
    ALTER COLUMN payload_object_key SET NOT NULL;

ALTER TABLE trace
    DROP COLUMN input,
    DROP COLUMN output,
    ALTER COLUMN payload_object_key SET NOT NULL;
