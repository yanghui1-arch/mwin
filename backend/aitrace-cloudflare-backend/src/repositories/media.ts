/** D1 metadata operations for user-owned R2 media objects. */
import { and, eq } from 'drizzle-orm';
import { mediaAssets } from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';
import type { MediaAsset } from '../domain/types.js';

function toMediaAsset(row: typeof mediaAssets.$inferSelect): MediaAsset {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    storageKey: row.storageKey,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdTime: row.createdTime,
  };
}

/** Persists ownership and content metadata after its R2 object is written. */
export async function createMediaAsset(db: AppDatabase, asset: MediaAsset): Promise<MediaAsset> {
  await db.insert(mediaAssets).values({
    id: asset.id,
    projectId: asset.projectId,
    userId: asset.userId,
    storageKey: asset.storageKey,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    createdTime: asset.createdTime,
  }).run();
  return asset;
}

/** Finds an asset only when it belongs to the authenticated dashboard user. */
export async function findMediaAssetForUser(db: AppDatabase, userId: string, mediaId: string): Promise<MediaAsset | null> {
  const row = await db.select().from(mediaAssets)
    .where(and(eq(mediaAssets.id, mediaId), eq(mediaAssets.userId, userId))).get();
  return row ? toMediaAsset(row) : null;
}
