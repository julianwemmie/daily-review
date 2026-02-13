# Daily Review

A spaced repetition app that turns Claude Code conversations into flashcards, helping retain what you learned throughout the day.

## How It Works

1. **Card generation**: A local Claude Code skill analyzes conversations (stored as JSONL in `~/.claude/projects/`) and extracts key concepts into flashcards.
2. **Upload**: Cards are sent to a cloud backend (API + Postgres).
3. **Review**: A web UI presents due cards. The user answers in free-form text. An LLM grader scores the response instead of comparing against a rigid "correct answer".
4. **Scheduling**: FSRS (Free Spaced Repetition Scheduler) manages when cards come back, based on the LLM grader's score.

## Architecture

- **Local** (Claude Code): Conversation parsing, card generation skill (`/flashcards` or `/daily-review`)
- **Cloud**: API + Postgres backend, review UI, LLM grader

## Data Model

See `planning/data-model.md` for full schema.

**Card** is the core primitive. Key design decisions:
- `front` (the prompt) + hidden `context` (reference material for the LLM grader, never shown to user)
- No `back` field — the LLM evaluates free-form answers
- FSRS scheduling fields are stored on the card but managed by the `ts-fsrs` library
- Cards start as `state: "new"` which maps to the triage/accept flow

**ReviewLog** is an append-only history of every review event, enabling stats and retention analytics.

## LLM Grader

The grader receives `front` + `context` + the user's free-form answer and produces a score (0-1), which maps to FSRS ratings:
- 0.0 - 0.3 → Again
- 0.3 - 0.6 → Hard
- 0.6 - 0.85 → Good
- 0.85 - 1.0 → Easy

## Tech

- **Scheduling**: [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- Cards store markdown strings (for code snippets); rendering with syntax highlighting is a UI concern
