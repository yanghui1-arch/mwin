import type { MediaAsset, Project } from '../domain/types.js';
import { newId, nowIso } from '../lib/utils.js';

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

interface MediaRepositories {
  ensureProject(project: Omit<Project, 'id'>): Promise<Project>;
  createMediaAsset(asset: MediaAsset): Promise<MediaAsset>;
  findMediaAssetForUser(userId: string, mediaId: string): Promise<MediaAsset | null>;
}

/** Stores SDK-uploaded images in R2 and keeps ownership metadata in D1. */
export class MediaService {
  constructor(private readonly repositories: MediaRepositories, private readonly bucket?: R2Bucket) {}

  async storeImage(userId: string, projectName: string, file: File): Promise<MediaAsset> {
    if (!this.bucket) throw new Error('Media storage is not configured');
    if (file.size === 0) throw new Error('Image file is required');
    if (file.size > MAX_IMAGE_SIZE_BYTES) throw new Error('Image exceeds the configured size limit');

    const extension = IMAGE_EXTENSIONS[file.type];
    if (!extension) throw new Error('Unsupported image format');

    const project = await this.repositories.ensureProject({
      userId,
      name: projectName,
      description: null,
      strategy: null,
      averageDuration: 0,
      cost: '0.0000000000',
      createdTimestamp: nowIso(),
      lastUpdateTimestamp: nowIso(),
    });
    const id = newId();
    const now = new Date();
    const storageKey = `${project.id}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${id}.${extension}`;
    const asset: MediaAsset = {
      id,
      projectId: project.id,
      userId,
      storageKey,
      mimeType: file.type,
      sizeBytes: file.size,
      createdTime: nowIso(),
    };

    await this.bucket.put(storageKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    try {
      return await this.repositories.createMediaAsset(asset);
    } catch (err) {
      await this.bucket.delete(storageKey);
      throw err;
    }
  }

  /** Resolves an R2 body only after the D1 ownership check succeeds. */
  async loadImage(userId: string, mediaId: string): Promise<{ asset: MediaAsset; object: R2ObjectBody } | null> {
    if (!this.bucket) return null;
    const asset = await this.repositories.findMediaAssetForUser(userId, mediaId);
    if (!asset) return null;
    const object = await this.bucket.get(asset.storageKey);
    return object ? { asset, object } : null;
  }
}
