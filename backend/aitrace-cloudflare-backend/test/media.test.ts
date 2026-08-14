import test from 'node:test';
import assert from 'node:assert/strict';
import { MediaService } from '../src/services/media.js';
import type { MediaAsset } from '../src/domain/types.js';

test('stores an SDK image in R2 and persists its owner-scoped metadata', async () => {
  const written: { key?: string; contentType?: string } = {};
  const storedAssets: MediaAsset[] = [];
  const repositories = {
    async ensureProject() {
      return { id: 42, userId: 'user-1', name: 'demo', description: null, strategy: null, averageDuration: 0, cost: '0', createdTimestamp: '', lastUpdateTimestamp: '' };
    },
    async createMediaAsset(asset: MediaAsset): Promise<MediaAsset> {
      storedAssets.push(asset);
      return asset;
    },
    async findMediaAssetForUser(): Promise<MediaAsset | null> { return null; },
  };
  const bucket = {
    async put(key: string, _value: ArrayBuffer, options: R2PutOptions) {
      written.key = key;
      const metadata = options.httpMetadata;
      written.contentType = metadata instanceof Headers ? metadata.get('content-type') ?? undefined : metadata?.contentType;
      return null;
    },
  };
  const file = {
    size: 3,
    type: 'image/png',
    async arrayBuffer() { return new Uint8Array([1, 2, 3]).buffer; },
  } as File;

  const asset = await new MediaService(repositories, bucket as unknown as R2Bucket).storeImage('user-1', 'demo', file);

  assert.equal(asset.projectId, 42);
  assert.equal(asset.userId, 'user-1');
  assert.match(asset.storageKey, /^42\/\d{4}\/\d{2}\/.+\.png$/);
  assert.equal(written.key, asset.storageKey);
  assert.equal(written.contentType, 'image/png');
  assert.deepEqual(storedAssets, [asset]);
});
