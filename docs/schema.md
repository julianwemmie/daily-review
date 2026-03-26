# Database Schema

Postgres database hosted on Supabase. All app tables use RLS with service-role-only access.

## Auth tables

The `user`, `session`, `account`, and `verification` tables are managed by [better-auth](https://www.better-auth.com/) — don't modify them by hand. A few app-specific columns have been added to `user`:

- `email_notifications_enabled` (boolean) — controls email nudges
- `last_review_at` (timestamptz) — tracks most recent review for inactivity detection
- `onboarding_completed` (boolean)

## App tables

### `cards`

The core table. Each row is a flashcard owned by a user.

| Column | Notes |
|---|---|
| `id` | UUID primary key |
| `user_id` | FK to `user` |
| `front` | Question text (plain text) |
| `back` | Answer / context (plain text, NOT NULL, defaults to `''`) |
| `source_conversation` | Path to the Claude conversation that generated the card |
| `tags` | JSONB array of tag strings |
| `status` | App-level lifecycle: `triaging`, `active`, `suspended` |
| `state` | FSRS state: `new`, `learning`, `review`, `relearning` |
| `due` | When the card is next due for review |
| `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `learning_steps`, `reps`, `lapses` | FSRS scheduling parameters — managed by ts-fsrs, don't set manually |
| `created_at` | TIMESTAMPTZ NOT NULL — when the card was created |
| `last_review` | Timestamp of most recent review |

Indexes: `(status, due)`, `(status)`, `(user_id)`.

### `review_logs`

Append-only history of every review event. One row per review.

| Column | Notes |
|---|---|
| `id` | UUID primary key |
| `card_id` | FK to `cards` (cascade delete) |
| `rating` | User's self-selected FSRS rating: `Again`, `Hard`, `Good`, `Easy` |
| `answer` | The user's free-form answer text (nullable) |
| `llm_score` | Informational accuracy score from the LLM grader (0-1) |
| `llm_feedback` | Written feedback from the grader |
| `reviewed_at` | Timestamp |

### `apikey`

API keys for CLI authentication, managed by better-auth's API key plugin.

| Column | Notes |
|---|---|
| `key` | The hashed key value (looked up on each CLI request) |
| `userId` | FK to `user` |
| `enabled` | Whether the key is active |
| `expiresAt` | Optional expiry |

The remaining columns (`rateLimitEnabled`, `remaining`, `refillInterval`, etc.) handle rate limiting — managed by the plugin.

### `email_nudges_sent`

Tracks which inactivity nudge emails have been sent to each user so the scheduler can escalate correctly.

| Column | Notes |
|---|---|
| `id` | TEXT primary key (auto-generated UUID) |
| `user_id` | FK to `user` |
| `gap_level` | Escalation tier: 1 = 1 day, 2 = 3 days, 3 = 7 days, 4 = 14 days |
| `sent_at` | When the nudge was sent |

### `deviceCode`

OAuth device-code flow for CLI login (e.g. `amber-cards login`).

| Column | Notes |
|---|---|
| `id` | TEXT primary key |
| `deviceCode` | Server-side device code |
| `userCode` | Short code shown to the user (unique) |
| `clientId` | Client identifier (NOT NULL) |
| `scope` | OAuth scope (nullable) |
| `userId` | FK to `user` — set once the user approves |
| `status` | `pending` until approved |
| `expiresAt` | Code expiry |
| `createdAt` | TIMESTAMP NOT NULL, defaults to NOW() |
| `updatedAt` | TIMESTAMP NOT NULL, defaults to NOW() |
| `lastPolledAt` | TIMESTAMP — last time the client polled for approval |
| `pollingInterval` | INTEGER — minimum seconds between polls |

## Key relationships

```
user  1──N  cards
user  1──N  apikey
user  1──N  email_nudges_sent
cards 1──N  review_logs
user  1──N  deviceCode
```

## Enums / types

These are defined in `src/shared/types.ts` and stored as `TEXT` in Postgres:

- **CardStatus** — app lifecycle: `triaging` (newly generated, needs triage), `active` (in rotation), `suspended` (paused by user)
- **CardState** — FSRS state: `new`, `learning`, `review`, `relearning`
- **Rating** — FSRS rating: `Again`, `Hard`, `Good`, `Easy`

## Related docs

- [overview.md](overview.md) — project overview and architecture
- [api.md](api.md) — API endpoints
- [cli.md](cli.md) — CLI usage
- [auth.md](auth.md) — authentication flow
- [env.md](env.md) — environment variables
