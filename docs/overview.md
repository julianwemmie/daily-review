# Daily Review

A spaced repetition app that turns Claude Code conversations into flashcards, helping retain what you learned throughout the day.

## How It Works

1. **Card generation**: A local Claude Code skill analyzes conversations (stored as JSONL in `~/.claude/projects/`) and extracts key concepts into flashcards.
2. **Upload**: Cards are sent to a cloud backend (API + Postgres).
3. **Review**: A web UI presents due cards. The user answers in free-form text. An LLM grader scores the response instead of comparing against a rigid "correct answer".
4. **Scheduling**: FSRS (Free Spaced Repetition Scheduler) manages when cards come back, based on the user's self-selected rating (Again / Hard / Good / Easy).
5. **Notifications**: Inactive users receive escalating email nudges (1 → 3 → 7 → 14 days) via Resend, encouraging them to return.

## Architecture

- **Local** (Claude Code): Conversation parsing, card generation skill (`/flashcards`)
- **Cloud**: Express API + Supabase Postgres, React review UI, LLM grader, email notifications

**ReviewLog** is an append-only history of every review event, enabling stats and retention analytics.

## LLM Grader

The grader receives `front` + `back` + the user's free-form answer and produces an informational score (0-1), displayed as "Accuracy: XX%" with feedback. The user then self-selects their FSRS rating (Again / Hard / Good / Easy).

Users can toggle between AI grading (LLM evaluates the answer) and self grading (user rates themselves without LLM evaluation).

The score is informational only — it helps the user gauge their answer, but does not determine the FSRS rating. The user manually selects their rating (Again / Hard / Good / Easy) after seeing the score.

## Authentication

- **User accounts**: Email/password and GitHub OAuth via [better-auth](https://www.better-auth.com/)
- **API keys**: Users generate API keys in the app to authenticate the `/flashcards` CLI skill when uploading cards

## Email Notifications

Re-engagement nudges for inactive users, sent via [Resend](https://resend.com/) and scheduled with `node-cron`.

- **Trigger**: Escalating inactivity gaps — 1 day, 3 days, 7 days, 14 days, then stop
- **User control**: On/off toggle in profile menu + one-click unsubscribe link in emails

## Tech

- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, Motion
- **Backend**: Express, Supabase (Postgres), better-auth
- **Scheduling**: [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- **Email**: [Resend](https://resend.com/), node-cron
- **AI**: Anthropic SDK (grading)
- Cards store plain text strings (which may contain code snippets); displayed with `whitespace-pre-wrap` to preserve formatting

## Related docs

- [API](api.md)
- [Auth](auth.md)
- [CLI](cli.md)
- [Database schema](schema.md)
