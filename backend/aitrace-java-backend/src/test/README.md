# AITrace Java Backend — Test Suite

## Overview

This test suite covers the AITrace Java backend with 156 tests across utility functions,
domain logic, factories, service layer, and REST controllers. All tests are written to
**verify actual correctness**, not just achieve pass rates. A test that passes despite
wrong production code is worse than no test at all.

---

## Test Structure

```
src/test/java/com/supertrace/aitrace/
├── AitraceApplicationTests.java                  — Spring context smoke test
├── controller/
│   └── StepControllerTest.java                   — StepController (standalone MockMvc)
├── domain/
│   └── core/
│       ├── step/
│       │   └── StepEnrichTest.java               — Step.enrich() business logic
│       └── usage/
│           ├── LLMUsageTest.java                 — Base LLM usage, getAudioTokens, getCost
│           ├── GeminiUsageTest.java               — Gemini completion token fallback
│           ├── OpenRouterUsageTest.java           — OpenRouter cost override
│           └── LLMUsageDeserializationTest.java  — JSONB round-trip polymorphism
├── dto/
│   └── step/
│       └── LogStepRequestDeserializationTest.java — Polymorphic usage deserialization
├── factory/
│   ├── StepFactoryTest.java                      — Step creation from DTO
│   └── TraceFactoryTest.java                     — Trace creation from DTO
├── response/
│   └── APIResponseTest.java                      — APIResponse factory methods
├── service/
│   ├── application/
│   │   └── impl/
│   │       ├── ApiKeyServiceImplTest.java        — API key lifecycle
│   │       ├── DeleteServiceImplTest.java        — Cascade delete (traces + steps)
│   │       ├── LogServiceImplTest.java           — Step/trace log orchestration
│   │       └── QueryServiceImplTest.java         — Paginated query with sort
│   └── domain/
│       └── impl/
│           ├── ProjectServiceImplTest.java       — CRUD + duplicate detection
│           ├── StepMetaServiceImplTest.java      — Cost extraction + provider validation
│           └── StepServiceImplTest.java          — Create vs. enrich logic
└── utils/
    └── ApiKeyUtilsTest.java                      — Key concealment + header extraction
```

---

## Running the Tests

```bash
# Run all tests
./gradlew test

# Run a specific class
./gradlew test --tests "com.supertrace.aitrace.utils.ApiKeyUtilsTest"

# Run all service tests
./gradlew test --tests "com.supertrace.aitrace.service.*"

# Run all controller tests
./gradlew test --tests "com.supertrace.aitrace.controller.*"
```

---

## What Each Test File Covers

### `ApiKeyUtilsTest`
Static utility tests requiring no Spring context.
- `concealApiKey`: null key, short key (≤6 chars), normal 35-char key (verifies exact positions),
  case sensitivity of Bearer prefix.
- `extractApiKeyFromHttpHeader`: null, no prefix, correct prefix, empty-after-prefix,
  lowercase prefix (not recognized).

### `APIResponseTest`
Verifies the `APIResponse<T>` factory methods return the correct HTTP code, message, and data
combinations. Ensures no shared mutable state between responses.

### `LLMUsageTest` / `GeminiUsageTest` / `OpenRouterUsageTest`
Pure unit tests for the LLM usage hierarchy:
- `LLMUsage.getAudioTokens()`: both-null → null, one set, both set, zero sum → null.
- `LLMUsage.getCost()`: base always returns null.
- `GeminiUsage.getCompletionTokens()`: falls back to `candidatesTokenCount` when base is null,
  respects explicit zero.
- `OpenRouterUsage.getCost()`: returns the set cost; null when not set; polymorphic dispatch works.

### `LLMUsageDeserializationTest`
Tests the class-level `@JsonTypeInfo` embedding `llm_provider` inside JSON (used by JSONB reads):
- `"openai"` → `LLMUsage`; `"open_router"` → `OpenRouterUsage`; absent → `defaultImpl`.
- Full round-trip serialization/deserialization for both types.

### `StepEnrichTest`
Exercises every branch of `Step.enrich()`:
- Tags: union with de-duplication, null new tags, null old tags, null values filtered.
- Input: `func_inputs` and `llm_inputs` prefer new value, fall back to old when new is null.
- Output: `funcOutput` and `llmOutputs` same preference rules.
- Model and usage: new overrides old; null new keeps old.
- Return value: must be the same instance (fluent mutator contract).

### `LogStepRequestDeserializationTest`
Tests the HTTP deserialization layer for the polymorphic `usage` field (EXTERNAL_PROPERTY):
- `"openai"` → `LLMUsage`; `"open_router"` → `OpenRouterUsage`.
- Neither provider nor usage present → `usage` is null.
- **Documents a real API constraint**: if `llm_provider` is present, `usage` MUST also be
  present. Jackson throws `MismatchedInputException` otherwise.

### `StepFactoryTest` / `TraceFactoryTest`
Verify that all DTO fields are mapped correctly to domain entities, including:
- UUID string parsing for `stepId`, `traceId`, `parentStepId`, `conversationId`.
- Null `parentStepId` → null on entity; invalid UUID → `IllegalArgumentException`.

### `ApiKeyServiceImplTest`
Mockito-based tests for `ApiKeyServiceImpl`:
- `generateAndStoreApiKey`: prefix `at-`, length 35, deletes old keys first, different calls
  produce different keys.
- `isApiKeyExist`: true/false, key-value mismatch edge case.
- `resolveUserIdFromApiKey` / `getUserLatestApiKey`: delegation and ordering.
- `isApiKeyOwnedByUser`: not implemented — returns false (guarded by test).

### `ProjectServiceImplTest`
Tests all project operations including error paths:
- Manual create: success + duplicate name throws `DuplicateProjectNameException`.
- Program create: same duplicate check.
- Update: description change, null description accepted, `lastUpdateTimestamp` refreshed,
  wrong project ID throws `ProjectNotFoundException`.
- Delete: success, no projects → `IllegalArgumentException`, name not found → `IllegalArgumentException`.

### `StepMetaServiceImplTest`
Covers the provider validation + cost extraction logic:
- Null, invalid, empty, and valid LLMProvider names.
- `LLMUsage.getCost()` returns null → stored as `BigDecimal.ZERO`.
- `OpenRouterUsage.getCost()` with value → stored correctly.
- Verifies `stepId` and `metadata` are passed through to the saved entity.

### `StepServiceImplTest`
Tests the create-vs-enrich branching logic:
- New step not in DB → `StepFactory.createStep()` is called.
- Existing step in DB → `Step.enrich()` is called; factory is NOT called.
- Tag merging happens during enrich.
- Invalid UUID format throws `IllegalArgumentException`.
- Pagination without/with Sort, empty result, delete.

### `LogServiceImplTest`
Tests the orchestration layer:
- Project owned by the current user → used directly; no auto-create.
- Project in DB but owned by different user → auto-create for current user.
- Project not in DB at all → auto-create.
- `StepMetaService.addStepMeta` always called after step logging.
- Same project-search logic applies to `logTrace`.

### `DeleteServiceImplTest`
Verifies cascade delete behaviour:
- All step IDs across multiple trace IDs are collected and deleted first.
- Trace delete happens after step delete (ordering enforced with `InOrder`).
- Empty input → no steps deleted, traces still called.
- Returns the same list of trace IDs passed in.

### `QueryServiceImplTest`
Tests query service:
- Project not found → `RuntimeException` with project name in message.
- Sort order: `startTime DESC` is applied to both steps and traces.
- Page and pageSize are forwarded to domain service.

### `StepControllerTest`
Standalone MockMvc tests (no application context loaded):
- `POST /api/v0/log/step`: valid key → 200 + stepId; invalid key → 400; userId not found → 400;
  missing header → 400; downstream exception → 400 with message.
- `GET /api/v0/step/{projectName}`: success → 200 with `PageVO`; default pagination params;
  project not found → 400.
- `POST /api/v0/step/delete`: valid UUIDs → 200 with deleted IDs; invalid UUID format → 400 with
  specific message; empty list → 200; downstream error → 400 with message.

---

## Known Bugs Found by Tests

### `ApiKeyUtils.concealApiKey()` — `StringIndexOutOfBoundsException` for short keys

**File:** `ApiKeyUtils.java:14`
**Test:** `ApiKeyUtilsTest.concealApiKey_keyLengthExactly32_doesNotThrowArrayIndexOutOfBounds`
**Status:** ⚠️ FAILING — documents a real bug

The concealment loop runs `for (int i = 6; i <= 32; i++)` which unconditionally accesses
index 32. For any key shorter than 33 characters but longer than 6, `setCharAt(32)` throws
`StringIndexOutOfBoundsException`.

Real API keys are always 35 characters (`at-` + 32 hex chars) so this does not affect
production. However, calling `concealApiKey` with any shorter input (e.g., a test key or
partial key) will crash.

**Fix:** Change the loop bound to `Math.min(end, apiKey.length() - 1)` or guard with a length check.

---

### Jackson EXTERNAL_PROPERTY Constraint (API Design Issue)

**File:** `LogStepRequest.java:54-65`
**Test:** `LogStepRequestDeserializationTest.deserialize_llmProviderPresentButUsageAbsent_throwsMismatchedInputException`
**Status:** ✅ PASSING — documents expected (but surprising) behavior

When `llm_provider` is set in a request JSON but `usage` is absent, Jackson throws
`MismatchedInputException: Missing property 'usage' for external type id 'llm_provider'`.
Clients must always send `usage` alongside `llm_provider`, or omit both.

---

## Design Decisions

### No Spring application context in service/unit tests
All service tests use `@ExtendWith(MockitoExtension.class)` with `@Mock` and `@InjectMocks`.
This avoids needing a running database or Redis, keeps tests fast, and isolates the
unit under test from its dependencies.

### Standalone MockMvc for controller tests
`MockMvcBuilders.standaloneSetup(controller)` is used instead of `@WebMvcTest` to avoid
loading the full Spring Security configuration. This means the JWT filter is not active in
controller tests — the tests inject `userId` directly via `request.setAttribute("userId", ...)`.

### Tests that FAIL are intentional
The test for the `concealApiKey` bug is written with `assertDoesNotThrow` and is expected to
**fail** on the current codebase. This is the first principle of this project: if the code is
wrong, the tests cannot pass. Fix the source, and the test will green.
