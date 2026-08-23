import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../domain/types.js';
import { Repositories } from '../repositories/index.js';
import { Services } from '../services/index.js';
import { AliyunOssPayloadStorage } from '../storage/aliyun-oss.js';

/** Creates request-scoped D1 repositories and business services. */
export const servicesMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const payloadStorage = new AliyunOssPayloadStorage({
    endpoint: c.env.OSS_ENDPOINT,
    bucket: c.env.OSS_BUCKET,
    accessKeyId: c.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: c.env.OSS_ACCESS_KEY_SECRET,
    maxRawSizeBytes: Number(c.env.OSS_MAX_RAW_SIZE_BYTES),
    maxStoredSizeBytes: Number(c.env.OSS_MAX_STORED_SIZE_BYTES),
  });
  c.set('services', new Services(new Repositories(c.env.DB), c.env.MEDIA_BUCKET, payloadStorage));
  await next();
});
