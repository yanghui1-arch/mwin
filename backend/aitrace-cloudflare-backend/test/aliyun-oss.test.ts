import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { AliyunOssPayloadStorage } from '../src/storage/aliyun-oss.js';
import type { S3CompatibleObject } from '../src/domain/types.js';

const options = {
  endpoint: 'oss-cn-shanghai.aliyuncs.com',
  bucket: 'mwintrack',
  accessKeyId: 'test-id',
  accessKeySecret: 'test-secret',
  maxRawSizeBytes: 1024 * 1024,
  maxStoredSizeBytes: 1024 * 1024,
};

test('payload storage writes a self-describing Step document and signs the OSS request', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestHeaders = new Headers();
  let requestBody = new Uint8Array();
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    requestUrl = request.url;
    requestHeaders = request.headers;
    requestBody = new Uint8Array(await request.arrayBuffer());
    return new Response(null, { status: 200 });
  };

  try {
    const storage = new AliyunOssPayloadStorage(options);
    const payload = {
      input: { prefix: 'shared-prefix-'.repeat(1000) },
      output: { result: 'ok' },
    };

    const object = await storage.storeStep('step-1', payload);

    assert.equal(object.objectKey, 'payloads/v2/step/step-1.json.gz');
    assert.equal(object.schemaVersion, 2);
    assert.equal(object.contentEncoding, 'gzip');
    assert.ok(object.storedSizeBytes < object.rawSizeBytes);
    assert.equal(requestUrl, 'https://mwintrack.oss-cn-shanghai.aliyuncs.com/payloads/v2/step/step-1.json.gz');
    assert.match(requestHeaders.get('authorization') ?? '', /^OSS test-id:/);
    assert.equal(requestHeaders.get('content-encoding'), null);
    assert.deepEqual(JSON.parse(new TextDecoder().decode(gunzipSync(requestBody))), {
      schema: 'mwin.step-payload/v2',
      data: payload,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('payload storage reads a typed v2 document and rejects a Step/Trace mismatch', async () => {
  const originalFetch = globalThis.fetch;
  const payload = { input: { prompt: 'hello' }, output: { answer: 'world' } };
  const raw = new TextEncoder().encode(JSON.stringify({
    schema: 'mwin.step-payload/v2',
    data: payload,
  }));
  const compressed = new Uint8Array(gzipSync(raw));
  globalThis.fetch = async () => new Response(compressed, { status: 200 });

  try {
    const storage = new AliyunOssPayloadStorage(options);
    const object = metadata('payloads/v2/step/step-1.json.gz', 2, raw, compressed);

    assert.deepEqual(await storage.loadStep(object, 'step-1'), payload);
    await assert.rejects(storage.loadTrace(object), /mwin\.trace-payload\/v2/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('payload storage rejects unsupported schema versions', async () => {
  const originalFetch = globalThis.fetch;
  const payload = { input: { prompt: 'hello' }, output: { answer: 'world' } };
  const raw = new TextEncoder().encode(JSON.stringify(payload));
  const compressed = new Uint8Array(gzipSync(raw));
  globalThis.fetch = async () => new Response(compressed, { status: 200 });

  try {
    const storage = new AliyunOssPayloadStorage(options);
    const object = metadata('payloads/v1/step/step-1.json.gz', 1, raw, compressed);

    await assert.rejects(storage.loadStep(object, 'step-1'), /Unsupported stored payload schema version: 1/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('payload storage writes and reads a v3 Step chunk', async () => {
  const originalFetch = globalThis.fetch;
  const entries = [
    { id: 'step-1', input: { prompt: 'one' }, output: { answer: 'first' } },
    { id: 'step-2', input: { prompt: 'two' }, output: { answer: 'second' } },
  ];
  let storedBody = new Uint8Array();
  let requestUrl = '';
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    requestUrl = request.url;
    if (request.method === 'PUT') {
      storedBody = new Uint8Array(await request.arrayBuffer());
      return new Response(null, { status: 200 });
    }
    return new Response(storedBody, { status: 200 });
  };

  try {
    const storage = new AliyunOssPayloadStorage(options);
    const object = await storage.storeStepChunk(entries);

    assert.equal(object.objectKey, 'payloads/v3/step-chunk/step-1.json.gz');
    assert.equal(object.schemaVersion, 3);
    assert.equal(requestUrl, 'https://mwintrack.oss-cn-shanghai.aliyuncs.com/payloads/v3/step-chunk/step-1.json.gz');
    assert.deepEqual(JSON.parse(new TextDecoder().decode(gunzipSync(storedBody))), {
      schema: 'mwin.step-payload-chunk/v3',
      data: { steps: entries },
    });
    assert.deepEqual(await storage.loadStep(object, 'step-2'), {
      input: entries[1].input,
      output: entries[1].output,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function metadata(
  objectKey: string,
  schemaVersion: number,
  raw: Uint8Array,
  compressed: Uint8Array,
): S3CompatibleObject {
  return {
    objectKey,
    contentType: 'application/gzip',
    contentEncoding: 'gzip',
    schemaVersion,
    rawSizeBytes: raw.byteLength,
    storedSizeBytes: compressed.byteLength,
    sha256: createHash('sha256').update(raw).digest('hex'),
    createdAt: '',
    updatedAt: '',
  };
}
