# D1 migrations

Migration filenames are append-only and execute in numeric order. After a
migration has been released, do not edit it, rename it, or fill an earlier gap;
D1 records the filename in its migration history.

`0003` was never published in this repository. `0004_nested_trace.sql` is
already part of the existing migration history, so that gap must remain. The
latest migration is `0006_remove_inline_payload_columns.sql`; the next migration
must use `0007`.
