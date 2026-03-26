# Environment Variables

Copy `.env.example` to `.env` and fill in the values. All variables are required unless marked optional.

## Core

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string (Supabase or direct) |
| `SUPABASE_URL` | Supabase project URL (local: `http://127.0.0.1:54321`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (full DB access) |
| `PORT` | Server port (optional, defaults to `3000`) |

## Auth

| Variable | Description |
|----------|-------------|
| `BETTER_AUTH_SECRET` | Secret for signing sessions and tokens |
| `BETTER_AUTH_URL` | Public URL of the app (used for OAuth callbacks) |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |

## AI

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key — powers LLM grading and card analysis |
| `OPENAI_API_KEY` | OpenAI API key — powers voice transcription via Whisper (optional, voice input disabled without it) |

## Email

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | [Resend](https://resend.com/) API key for sending notification emails |
| `RESEND_FROM` | Sender address (e.g. `Amber <notifications@amber.cards>`) |
| `RESEND_UNSUBSCRIBE_SECRET` | HMAC secret for signing one-click unsubscribe tokens |

## Client

| Variable | Description |
|----------|-------------|
| `VITE_APP_URL` | Public app URL, available to the client via Vite's `import.meta.env` |

## CLI

| Variable | Description |
|----------|-------------|
| `AMBER_CARDS_API_KEY` | API key for CLI authentication (skips `amber login`) |
| `AMBER_CARDS_URL` | Override the default server URL for CLI commands |

## Related docs

- [Project overview](overview.md)
- [Authentication](auth.md)
- [API reference](api.md)
- [CLI reference](cli.md)
- [Database schema](schema.md)
