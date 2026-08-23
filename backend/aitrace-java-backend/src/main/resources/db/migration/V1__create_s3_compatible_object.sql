CREATE TABLE IF NOT EXISTS s3_compatible_object (
    object_key VARCHAR(1024) PRIMARY KEY,
    content_type VARCHAR(127) NOT NULL,
    content_encoding VARCHAR(32) NOT NULL,
    schema_version INTEGER NOT NULL,
    raw_size_bytes BIGINT NOT NULL,
    stored_size_bytes BIGINT NOT NULL,
    sha256 CHAR(64) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

DO $$
BEGIN
    IF to_regclass('public.step') IS NOT NULL THEN
        ALTER TABLE step ADD COLUMN IF NOT EXISTS payload_object_key VARCHAR(1024);
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_step_payload_object'
        ) THEN
            ALTER TABLE step
                ADD CONSTRAINT fk_step_payload_object
                FOREIGN KEY (payload_object_key)
                REFERENCES s3_compatible_object(object_key);
        END IF;
    END IF;

    IF to_regclass('public.trace') IS NOT NULL THEN
        ALTER TABLE trace ADD COLUMN IF NOT EXISTS payload_object_key VARCHAR(1024);
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_trace_payload_object'
        ) THEN
            ALTER TABLE trace
                ADD CONSTRAINT fk_trace_payload_object
                FOREIGN KEY (payload_object_key)
                REFERENCES s3_compatible_object(object_key);
        END IF;
    END IF;
END $$;
