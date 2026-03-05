---
status: done
type: chore
created: 2026-03-04
---

# Add unit tests for the whole app

Add unit tests across the application to improve code coverage and catch regressions.

## Approach

- **Framework**: Vitest (integrates with existing Vite setup)
- **HTTP testing**: supertest for realistic API route tests
- **File layout**: `tests/` directory mirroring `src/` structure
- **Scope**: Server + shared logic (no React component tests)

## Test targets (priority order)

1. **Parsers** (`src/shared/parsers/`) — Anki cloze handling, HTML stripping, Mochi EDN parsing, card mapping
2. **Scheduling** (`src/server/scheduling.ts`) — FSRS bridge functions
3. **Validation middleware** (`src/server/middleware/validate.ts`) — Zod schema enforcement
4. **API routes** (`src/server/routes.ts`) — Full request lifecycle with mocked DbProvider via supertest
