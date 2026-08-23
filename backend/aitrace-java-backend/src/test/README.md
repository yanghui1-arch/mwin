# AITrace Java Backend Tests

## Test strategy

Tests are organized around observable features rather than one test per method:

- Keep one main success scenario for each important workflow.
- Cover failure boundaries that can cause data loss, unauthorized access, or incompatible payloads.
- Avoid tests that only repeat a repository call or assert an implementation detail.
- Use unit tests for orchestration and edge cases; use repository integration tests for real JPA queries.

## OSS payload coverage

- `PayloadCodecTest`: typed JSON + gzip round trip, checksum/schema/version validation, and raw/decompressed size limits.
- `StepServiceImplTest` and `TraceServiceImplTest`: completed snapshot storage, lazy payload loading, OSS failure, and ownership checks.
- `SummaryProjectionRepositoryTest`: real Step/Trace summary projections without loading payload data.
- `StepControllerTest`: payload API response and unauthorized/missing Step behavior.
- Factory tests only cover complete entity mapping and malformed identifier boundaries.

## Running tests

```bash
# All tests
./gradlew test

# OSS payload unit tests
./gradlew test --tests "com.supertrace.aitrace.service.storage.PayloadCodecTest" \
  --tests "com.supertrace.aitrace.service.domain.impl.StepServiceImplTest" \
  --tests "com.supertrace.aitrace.service.domain.impl.TraceServiceImplTest"

# Repository integration test (requires the configured PostgreSQL database)
./gradlew test --tests "com.supertrace.aitrace.repository.SummaryProjectionRepositoryTest"
```

The repository integration test is transactional, but Flyway still needs permission to validate or migrate the configured test database before the test starts.
