# REST API

Base URL: `/api`

All `/api/*` routes require authentication (session cookie or `x-api-key` header). Auth itself is handled by better-auth at `/auth/*` (outside this API).

The one exception is `GET /api/unsubscribe`, which is unauthenticated (token-based).

---

## Cards

| Method | Path | Description | Input |
|--------|------|-------------|-------|
| `POST` | `/api/cards` | Create a single card | Body: `{ front, back?, tags? }` |
| `POST` | `/api/cards/batch-create` | Create up to 500 cards. Returns `{ created: number, cards: Card[] }` | Body: `{ cards: [{ front, back?, tags? }] }` |
| `GET` | `/api/cards` | List cards (see views below) | Query params |
| `GET` | `/api/cards/counts` | Badge counts. Returns `{ new: number, due: number }` | -- |
| `PATCH` | `/api/cards/:id` | Update a card's content or status | Body: `{ front?, back?, tags?, status? }` |
| `DELETE` | `/api/cards/:id` | Delete a card | -- |

### Card list views (`GET /api/cards`)

The `view` query param switches behavior:

- **`?view=triage`** -- cards with status `triaging`
- **`?view=due`** -- cards due for review (FSRS scheduling)
- **`?view=list`** (or omitted) -- all cards; supports `?status=` and `?q=` filters

### Batch operations

| Method | Path | Description | Input |
|--------|------|-------------|-------|
| `POST` | `/api/cards/batch-accept` | Accept triage cards (move to active) | Body: `{ ids: [uuid] }` (max 500) |
| `POST` | `/api/cards/batch-delete` | Delete multiple cards | Body: `{ ids: [uuid] }` (max 500) |

---

## Reviews

| Method | Path | Description | Input |
|--------|------|-------------|-------|
| `POST` | `/api/cards/:id/evaluate` | Get LLM grading for an answer (no scheduling side-effects) | Body: `{ answer }` |
| `POST` | `/api/cards/:id/review` | Submit a review and reschedule the card | Body: `{ rating, answer?, llm_score?, llm_feedback? }` |

`rating` is one of: `Again`, `Hard`, `Good`, `Easy`.

---

## Notifications

| Method | Path | Description | Input |
|--------|------|-------------|-------|
| `GET` | `/api/notifications` | Get email notification preference. Returns `{ email_notifications_enabled: boolean }` | -- |
| `PUT` | `/api/notifications` | Update email notification preference. Returns `{ email_notifications_enabled: boolean }` | Body: `{ enabled: bool }` |
| `GET` | `/api/unsubscribe` | One-click email unsubscribe (unauthenticated) | Query: `?token=` |

---

## Onboarding

| Method | Path | Description | Input |
|--------|------|-------------|-------|
| `GET` | `/api/onboarding/status` | Check if onboarding is completed | -- |
| `POST` | `/api/onboarding/complete` | Mark onboarding as completed | -- |

---

## Auth (`/auth/*`)

Handled by [better-auth](https://www.better-auth.com/), not by the Express routes above. Supports:

- Email/password sign-up and sign-in
- GitHub OAuth
- API key creation and verification (used by the CLI skill)
- Device authorization flow (used by the CLI for headless login)

---

## Related docs

- [Project overview](overview.md)
- [CLI reference](cli.md)
- [Database schema](schema.md)
- [Authentication](auth.md)
