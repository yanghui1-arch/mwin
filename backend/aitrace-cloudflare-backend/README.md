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
- `src/repositories/`: D1 queries and persistence mapping.
- `src/domain/`: application types and repository contracts.
- `src/lib/`: authentication, response, decimal, and request helpers.
- `src/config/`: model pricing configuration and its loader.

R2 stores optional media binaries, while their metadata is persisted in D1.

## Cloudflare bindings

- `DB`: D1 database created from `migrations/0001_schema.sql`.
- `MEDIA_BUCKET`: optional R2 bucket for `/api/v0/media/upload`.
- `JWT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: Worker secrets.

## Tests

```sh
npm test
```

The test suite focuses on billing-sensitive behavior: token tier resolution,
precise cost rounding, overview token aggregation, and project cost deltas.
