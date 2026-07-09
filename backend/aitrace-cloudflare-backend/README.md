# AITrace Cloudflare Backend

This Worker is a Cloudflare-free-tier-compatible backend that mirrors the Java
Spring service under `backend/aitrace-java-backend`.

## Runtime mapping

- Spring controllers become Worker route handlers in `src/index.js`.
- JPA repositories become D1 SQL helpers in `src/repositories.js`.
- Java service behavior is implemented in `src/services.js`.
- `llm-pricing.json` is copied from the Java backend and resolved by
  `src/pricing.js`.
- Media upload metadata is stored in D1 and binary data is written to R2.

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
