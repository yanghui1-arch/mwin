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

## Cloudflare bindings

- `DB`: D1 database created from `migrations/0001_schema.sql`.
- `MEDIA_BUCKET`: optional R2 bucket for `/api/v0/media/upload`.
- `JWT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: Worker secrets.

## Database workflow

Existing `migrations/` files remain the production migration history used by
Wrangler. Drizzle provides the TypeScript schema and future schema tooling:

```sh
npm run db:generate
npm run db:check
```

## Tests

```sh
npm test
```

The test suite focuses on transaction boundaries, billing-sensitive behavior:
token tier resolution, precise cost rounding, overview token aggregation, and
project cost deltas.
