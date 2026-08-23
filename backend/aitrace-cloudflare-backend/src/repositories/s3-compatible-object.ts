import { eq } from 'drizzle-orm';
import { s3CompatibleObjects } from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';
import type { S3CompatibleObject } from '../domain/types.js';

export function upsertS3CompatibleObjectStatement(
  db: D1Database,
  object: S3CompatibleObject,
): D1PreparedStatement {
  return db.prepare(`INSERT INTO s3_compatible_object
    (object_key, content_type, content_encoding, schema_version, raw_size_bytes,
     stored_size_bytes, sha256, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(object_key) DO UPDATE SET
      content_type = excluded.content_type,
      content_encoding = excluded.content_encoding,
      schema_version = excluded.schema_version,
      raw_size_bytes = excluded.raw_size_bytes,
      stored_size_bytes = excluded.stored_size_bytes,
      sha256 = excluded.sha256,
      updated_at = excluded.updated_at`)
    .bind(
      object.objectKey,
      object.contentType,
      object.contentEncoding,
      object.schemaVersion,
      object.rawSizeBytes,
      object.storedSizeBytes,
      object.sha256,
      object.createdAt,
      object.updatedAt,
    );
}

const MAX_D1_BOUND_PARAMETERS = 100;
const S3_OBJECT_PARAMETER_COUNT = 9;

/** Builds bounded multi-row metadata UPSERTs for TraceTree transactions. */
export function upsertS3CompatibleObjectStatements(
  db: D1Database,
  objects: S3CompatibleObject[],
): D1PreparedStatement[] {
  const statements: D1PreparedStatement[] = [];
  const chunkSize = Math.floor(MAX_D1_BOUND_PARAMETERS / S3_OBJECT_PARAMETER_COUNT);
  for (let offset = 0; offset < objects.length; offset += chunkSize) {
    const chunk = objects.slice(offset, offset + chunkSize);
    const values = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const parameters = chunk.flatMap((object) => [
      object.objectKey,
      object.contentType,
      object.contentEncoding,
      object.schemaVersion,
      object.rawSizeBytes,
      object.storedSizeBytes,
      object.sha256,
      object.createdAt,
      object.updatedAt,
    ]);
    statements.push(db.prepare(`INSERT INTO s3_compatible_object
      (object_key, content_type, content_encoding, schema_version, raw_size_bytes,
       stored_size_bytes, sha256, created_at, updated_at)
      VALUES ${values}
      ON CONFLICT(object_key) DO UPDATE SET
        content_type = excluded.content_type,
        content_encoding = excluded.content_encoding,
        schema_version = excluded.schema_version,
        raw_size_bytes = excluded.raw_size_bytes,
        stored_size_bytes = excluded.stored_size_bytes,
        sha256 = excluded.sha256,
        updated_at = excluded.updated_at`)
      .bind(...parameters));
  }
  return statements;
}

export async function findS3CompatibleObject(
  db: AppDatabase,
  objectKey: string,
): Promise<S3CompatibleObject | null> {
  const object = await db.select().from(s3CompatibleObjects)
    .where(eq(s3CompatibleObjects.objectKey, objectKey)).get();
  if (!object) return null;
  if (object.contentEncoding !== 'gzip') throw new Error('Unsupported payload encoding');
  return { ...object, contentEncoding: 'gzip' };
}
