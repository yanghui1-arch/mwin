# AITrace Cloudflare Backend

This Worker is a Cloudflare-free-tier-compatible backend that mirrors the Java
Spring service under `backend/aitrace-java-backend`.

## Architecture

The Worker follows Hono's larger-application pattern: each API resource is an
independent `Hono` sub-application, and `src/app.ts` composes those routers with
`app.route()`. `src/index.ts` only exports the Worker entry point.

- `src/routes/`: HTTP handlers grouped by API resource.
- `src/middleware/`: request-scoped dependency setup.
- `src/services/`: business behavior shared by route handlers.
- `src/repositories/`: persistence and D1 transaction boundaries.
- `src/db/`: Drizzle ORM schema and typed D1 database factory.
- `src/domain/`: application types and repository contracts.
- `src/lib/`: authentication, response, decimal, and request helpers.
- `src/config/`: model pricing configuration and its loader.

Normal CRUD operations use Drizzle ORM for typed SQL and schema-aware column
mapping. Critical multi-write mutations use D1 `batch()` transactions, with
Drizzle builders where applicable and narrowly scoped SQL expressions for
tenant-guarded UPSERTs and fixed-point aggregate updates.

R2 stores optional media binaries, while their metadata is persisted in D1.
Step and Trace payloads use Alibaba OSS instead of R2. The Worker writes a
gzip-compressed, self-describing document and D1 stores its metadata in
`s3_compatible_object`. Step objects use `mwin.step-payload/v2`, Trace objects
use `mwin.trace-payload/v2`, and older OSS schema versions are not maintained.
D1 does not keep inline payload columns.

## Cloudflare bindings

- `DB`: D1 database created from `migrations/0001_schema.sql`.
- `MEDIA_BUCKET`: optional R2 bucket for `/api/v0/media/upload`.
- `JWT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: Worker secrets.
- `OSS_ENDPOINT`, `OSS_BUCKET`, and payload size limits: non-secret vars in
  `wrangler.toml`.
- `TELEMETRY_MAX_REQUEST_SIZE_BYTES`: maximum buffered telemetry request size.
- `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET`: Worker secrets.

Set the OSS credentials without committing them:

```sh
npx wrangler secret put OSS_ACCESS_KEY_ID
npx wrangler secret put OSS_ACCESS_KEY_SECRET
```

New payloads use deterministic keys:

```text
payloads/v2/step/{stepId}.json.gz
payloads/v2/trace/{traceId}.json.gz
```

The Worker accepts at most 8 MiB for one raw or compressed payload and 16 MiB
for one telemetry HTTP request. TraceTree does not impose an application-level
node limit. Its D1 writes use bounded multi-row statements and remain one
`batch()` transaction.

List and tracks endpoints return summaries only. The dashboard loads payloads
through `GET /api/v0/step/{stepId}/payload` and
`GET /api/v0/trace/{traceId}/payload` when a row or process node is opened.

To enable the SDK image endpoints, create an R2 bucket and bind it as
`MEDIA_BUCKET`; without that binding the media routes return a configuration
error while all other API routes remain available.

```toml
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "aitrace-media"
```

## Database workflow

Existing `migrations/` files remain the production migration history used by
Wrangler. Drizzle provides the TypeScript schema and future schema tooling:

```sh
npm run db:generate
npm run db:check
npm run typegen:check
```

## Tests

```sh
npm test
```

The test suite focuses on transaction boundaries, billing-sensitive behavior:
token tier resolution, precise cost rounding, overview token aggregation, and
project cost deltas.
