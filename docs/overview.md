# Daily Review

A spaced repetition app that turns Claude Code conversations into flashcards, helping retain what you learned throughout the day.

## How It Works

1. **Card generation**: A local Claude Code skill analyzes conversations (stored as JSONL in `~/.claude/projects/`) and extracts key concepts into flashcards.
2. **Upload**: Cards are sent to a cloud backend (API + Postgres).
3. **Review**: A web UI presents due cards. The user answers in free-form text. An LLM grader scores the response instead of comparing against a rigid "correct answer".
4. **Scheduling**: FSRS (Free Spaced Repetition Scheduler) manages when cards come back, based on the LLM grader's score.

## Architecture

- **Local** (Claude Code): Conversation parsing, card generation skill (`/flashcards`)
- **Cloud**: API + Postgres backend, review UI, LLM grader

**ReviewLog** is an append-only history of every review event, enabling stats and retention analytics.

## LLM Grader

The grader receives `front` + `back` + the user's free-form answer and produces an informational score (0-1), displayed as "Accuracy: XX%" with feedback. The user then self-selects their FSRS rating (Again / Hard / Good / Easy). Score ranges for reference:
- 0.0 - 0.3 → Again
- 0.3 - 0.6 → Hard
- 0.6 - 0.85 → Good
- 0.85 - 1.0 → Easy

## Tech

- **Scheduling**: [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- Cards store markdown strings (for code snippets); rendering with syntax highlighting is a UI concern
