import type { JsonObject, S3CompatibleObject, StepPayload, StepPayloadChunk, StepPayloadChunkEntry, TracePayload } from '../domain/types.js';

const CONTENT_TYPE = 'application/gzip';
const CONTENT_ENCODING = 'gzip' as const;
const PAYLOAD_SCHEMA_VERSION = 2;
const STEP_CHUNK_SCHEMA_VERSION = 3;
const STEP_SCHEMA = 'mwin.step-payload/v2';
const STEP_CHUNK_SCHEMA = 'mwin.step-payload-chunk/v3';
const TRACE_SCHEMA = 'mwin.trace-payload/v2';
const ERROR_BODY_LIMIT = 4096;

export interface PayloadObjectStorage {
  storeStep(stepId: string, payload: StepPayload): Promise<S3CompatibleObject>;
  storeStepChunk(entries: StepPayloadChunkEntry[]): Promise<S3CompatibleObject>;
  storeTrace(traceId: string, payload: TracePayload): Promise<S3CompatibleObject>;
  loadStep(object: S3CompatibleObject, stepId: string): Promise<StepPayload>;
  loadTrace(object: S3CompatibleObject): Promise<TracePayload>;
}

interface AliyunOssOptions {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
  maxRawSizeBytes: number;
  maxStoredSizeBytes: number;
}

export class AliyunOssPayloadStorage implements PayloadObjectStorage {
  private readonly endpoint: string;

  constructor(private readonly options: AliyunOssOptions) {
    this.endpoint = options.endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  storeStep(stepId: string, payload: StepPayload) {
    return this.store(
      `payloads/v2/step/${stepId}.json.gz`,
      PAYLOAD_SCHEMA_VERSION,
      STEP_SCHEMA,
      payload,
    );
  }

  storeStepChunk(entries: StepPayloadChunkEntry[]) {
    return this.store(
      `payloads/v3/step-chunk/${entries[0].id}.json.gz`,
      STEP_CHUNK_SCHEMA_VERSION,
      STEP_CHUNK_SCHEMA,
      { steps: entries },
    );
  }

  storeTrace(traceId: string, payload: TracePayload) {
    return this.store(
      `payloads/v2/trace/${traceId}.json.gz`,
      PAYLOAD_SCHEMA_VERSION,
      TRACE_SCHEMA,
      payload,
    );
  }

  async loadStep(object: S3CompatibleObject, stepId: string): Promise<StepPayload> {
    if (object.schemaVersion === PAYLOAD_SCHEMA_VERSION) {
      const payload = await this.load(object, PAYLOAD_SCHEMA_VERSION, STEP_SCHEMA);
      if (!isPayload(payload)) throw new Error('Stored payload must contain JSON input and output');
      return payload;
    }
    if (object.schemaVersion === STEP_CHUNK_SCHEMA_VERSION) {
      const chunk = await this.load(object, STEP_CHUNK_SCHEMA_VERSION, STEP_CHUNK_SCHEMA);
      if (!isStepPayloadChunk(chunk)) throw new Error('Stored Step chunk is invalid');
      const entry = chunk.steps.find((step) => step.id === stepId);
      if (!entry) throw new Error(`Step payload not found in chunk: ${stepId}`);
      return { input: entry.input, output: entry.output };
    }
    throw new Error(`Unsupported stored payload schema version: ${object.schemaVersion}`);
  }

  async loadTrace(object: S3CompatibleObject): Promise<TracePayload> {
    const payload = await this.load(object, PAYLOAD_SCHEMA_VERSION, TRACE_SCHEMA);
    if (!isPayload(payload)) throw new Error('Stored payload must contain JSON input and output');
    return payload;
  }

  private async load(
    object: S3CompatibleObject,
    expectedVersion: number,
    expectedSchema: string,
  ): Promise<unknown> {
    const response = await this.request('GET', object.objectKey);
    if (!response.ok) throw await this.ossError('read', response);
    const compressed = await readLimited(response.body, this.options.maxStoredSizeBytes);
    const raw = await decompressGzip(compressed, this.options.maxRawSizeBytes);
    const checksum = await sha256Hex(raw);
    if (checksum !== object.sha256.toLowerCase()) throw new Error('Payload checksum mismatch');
    if (object.schemaVersion !== expectedVersion) {
      throw new Error(`Unsupported stored payload schema version: ${object.schemaVersion}`);
    }
    const document: unknown = JSON.parse(new TextDecoder().decode(raw));
    if (!isJsonObject(document)
      || document.schema !== expectedSchema
      || !('data' in document)) {
      throw new Error(`Stored payload schema does not match ${expectedSchema}`);
    }
    return document.data;
  }

  private async store(
    objectKey: string,
    schemaVersion: number,
    schema: string,
    payload: StepPayload | StepPayloadChunk | TracePayload,
  ): Promise<S3CompatibleObject> {
    const raw = new TextEncoder().encode(JSON.stringify({ schema, data: payload }));
    requireWithinLimit(raw.byteLength, this.options.maxRawSizeBytes, 'Raw payload');
    const compressed = await compressGzip(raw);
    requireWithinLimit(compressed.byteLength, this.options.maxStoredSizeBytes, 'Compressed payload');

    const response = await this.request('PUT', objectKey, compressed, {
      'content-type': CONTENT_TYPE,
    });
    if (!response.ok) throw await this.ossError('write', response);
    await response.body?.cancel();

    const now = new Date().toISOString();
    return {
      objectKey,
      contentType: CONTENT_TYPE,
      contentEncoding: CONTENT_ENCODING,
      schemaVersion,
      rawSizeBytes: raw.byteLength,
      storedSizeBytes: compressed.byteLength,
      sha256: await sha256Hex(raw),
      createdAt: now,
      updatedAt: now,
    };
  }

  private async request(
    method: 'GET' | 'PUT',
    objectKey: string,
    body?: Uint8Array,
    extraHeaders: Record<string, string> = {},
  ): Promise<Response> {
    if (!this.options.accessKeyId || !this.options.accessKeySecret) {
      throw new Error('Alibaba OSS credentials are not configured');
    }
    const date = new Date().toUTCString();
    const contentType = extraHeaders['content-type'] ?? '';
    const canonicalResource = `/${this.options.bucket}/${objectKey}`;
    const stringToSign = `${method}\n\n${contentType}\n${date}\n${canonicalResource}`;
    const signature = await hmacSha1Base64(this.options.accessKeySecret, stringToSign);
    const encodedKey = objectKey.split('/').map(encodeURIComponent).join('/');
    return fetch(`https://${this.options.bucket}.${this.endpoint}/${encodedKey}`, {
      method,
      headers: {
        date,
        authorization: `OSS ${this.options.accessKeyId}:${signature}`,
        ...extraHeaders,
      },
      body,
    });
  }

  private async ossError(operation: string, response: Response): Promise<Error> {
    const body = new TextDecoder().decode(await readLimited(response.body, ERROR_BODY_LIMIT));
    return new Error(`Failed to ${operation} payload in OSS (${response.status}): ${body}`);
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPayload(value: unknown): value is StepPayload | TracePayload {
  if (!isJsonObject(value) || !('input' in value) || !('output' in value)) return false;
  return isJsonObject(value.input) || value.input === null
    ? isJsonObject(value.output) || value.output === null
    : false;
}

function isStepPayloadChunk(value: unknown): value is StepPayloadChunk {
  return isJsonObject(value)
    && Array.isArray(value.steps)
    && value.steps.every((entry) => isJsonObject(entry)
      && typeof entry.id === 'string'
      && isPayload(entry));
}

async function compressGzip(raw: Uint8Array): Promise<Uint8Array> {
  const stream = new Response(raw).body;
  if (!stream) throw new Error('Unable to create payload stream');
  return readLimited(stream.pipeThrough(new CompressionStream('gzip')), Number.MAX_SAFE_INTEGER);
}

async function decompressGzip(compressed: Uint8Array, limit: number): Promise<Uint8Array> {
  const stream = new Response(compressed).body;
  if (!stream) throw new Error('Unable to create stored payload stream');
  return readLimited(stream.pipeThrough(new DecompressionStream('gzip')), limit);
}

async function readLimited(stream: ReadableStream<Uint8Array> | null, limit: number): Promise<Uint8Array> {
  if (!stream) return new Uint8Array();
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      requireWithinLimit(total, limit, 'Payload');
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function requireWithinLimit(size: number, limit: number, label: string): void {
  if (size > limit) throw new Error(`${label} exceeds the configured limit of ${limit} bytes`);
}

async function sha256Hex(value: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', value);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacSha1Base64(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...signature));
}
