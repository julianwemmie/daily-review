# Amber

A beautiful, opinionated spaced repetition app with AI-powered grading and FSRS scheduling. Users can create cards manually, import from Anki or Mochi, or generate them automatically using the CLI and Claude Code plugin.

## How It Works

1. **Card creation**: Users add cards manually in the web app, import decks from Anki (.apkg) or Mochi (.mochi), or use the CLI/Claude Code plugin to auto-generate cards from conversations.
2. **Review**: A web UI presents due cards. The user answers in free-form text. An LLM grader scores the response instead of comparing against a rigid "correct answer".
3. **Scheduling**: FSRS (Free Spaced Repetition Scheduler) manages when cards come back, based on the user's self-selected rating (Again / Hard / Good / Easy).
4. **Notifications**: Inactive users receive escalating email nudges (1 → 3 → 7 → 14 days) via Resend, encouraging them to return.

## Architecture

- **Web app**: React review UI, LLM grader, Express API + Supabase Postgres, email notifications
- **Marketing site** (`site/`): Astro-based landing page and user docs, deployed to Netlify at `amber.cards`
- **CLI** (optional): Card upload, authentication, Claude Code plugin for automatic card generation from conversations

**ReviewLog** is an append-only history of every review event, enabling stats and retention analytics.

## LLM Grader

The grader receives `front` + `back` + the user's free-form answer and produces an informational score (0-1), displayed as "Accuracy: XX%" with feedback. The user then self-selects their FSRS rating (Again / Hard / Good / Easy).

Users can toggle between AI grading (LLM evaluates the answer) and self grading (user rates themselves without LLM evaluation).

The score is informational only — it helps the user gauge their answer, but does not determine the FSRS rating. The user manually selects their rating (Again / Hard / Good / Easy) after seeing the score.

## Voice Input

Users can answer review cards by voice. The app records audio via the Web Audio API, sends it to a server-side Whisper transcription endpoint (`POST /api/transcribe`), and fills in the answer field with the result. Requires `OPENAI_API_KEY`.

## Stats & Card Analysis

The home tab shows aggregate stats: active card count, current and longest review streaks, total reviews, average LLM score, and a GitHub-style contribution grid (reviews per day over the last year).

Individual cards can be analyzed by an LLM (`POST /api/cards/:id/analyze`) which reviews the history of answers to detect trends — declining quality, lazy answers, genuine understanding, etc.

## Authentication

- **User accounts**: Email/password and GitHub OAuth via [better-auth](https://www.better-auth.com/)
- **API keys**: Users generate API keys in the app to authenticate the CLI when uploading cards

## Email Notifications

Re-engagement nudges for inactive users, sent via [Resend](https://resend.com/) and scheduled with `node-cron`.

- **Trigger**: Escalating inactivity gaps — 1 day, 3 days, 7 days, 14 days, then stop
- **User control**: On/off toggle in profile menu + one-click unsubscribe link in emails

## Tech

- **Frontend**: React, Vite, Tailwind CSS, Radix UI, Motion
- **Backend**: Express, Supabase (Postgres), better-auth
- **Scheduling**: [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- **Email**: [Resend](https://resend.com/), node-cron
- **AI**: Anthropic SDK (grading, card analysis), OpenAI Whisper (voice transcription)
- Cards store plain text strings (which may contain code snippets); displayed with `whitespace-pre-wrap` to preserve formatting

## Frontend

The web client uses React Router with tab-based navigation across seven views: Home (stats dashboard), Review, Triage (new card stack), Explore (card browser), Create, Auth, and Device pairing.

A **storage provider abstraction** lets the same UI code work in two modes:
- **ApiStorageProvider** — authenticated users, delegates to `/api` endpoints
- **MemoryStorageProvider** — unauthenticated demo mode with in-memory state and sample cards

Keyboard shortcuts are available via a `useHotkey` hook (arrow keys for tab navigation, Cmd/Ctrl+Enter to submit).

## Related docs

- [API](api.md)
- [Auth](auth.md)
- [CLI](cli.md)
- [Database schema](schema.md)
- [Environment variables](env.md)
