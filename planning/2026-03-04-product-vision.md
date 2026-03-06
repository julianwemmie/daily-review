# Product Vision — Amber

_2026-03-04_

## What is Amber?

A beautiful, opinionated spaced repetition app that just works. No decks, no config, no multiple choice — just cards, active recall, and a smart algorithm. Built for people who value craft in their tools. AI is deeply integrated but never required.

## Target audience

- Developers and knowledge workers who spend their day in AI tools (Claude Code, etc.)
- People who love delightful, minimal software that is thought through
- You don't have to use the AI integration — if you just like minimal software that works, this is for you

## Core opinions

- **No decks.** Everything goes in one pile. Trust the algorithm.
- **No multiple choice.** Active recall only. Type your answer.
- **No configuration rabbit holes.** Sane defaults, done.
- **AI is an accelerant, not a crutch.** You can use it or not.
- **Tags are being removed.** They add unnecessary complexity.

## The vibe

Apple-meets-MonkeyType. Minimal, fast, keyboard-friendly on desktop, touch-friendly on mobile. You should be able to start reviewing within 2 seconds of opening the app.

Reference apps: Claude Code, Mochi, Notion, Obsidian, MonkeyType, Apple products. The common thread — they feel like tools made by people who use them. Fast, keyboard-driven, crafted.

## North star feeling

> "Wow that was easy. That was fun."

Easy and fun simultaneously.

## Why not Anki / Mochi?

- Anki is ugly and overwhelming with configuration
- Mochi is nice but has no AI integration
- Amber sits in between: beautiful and minimal like Mochi, with deep AI integration that no one else has

## AI integration

- **Card generation**: Any AI agent can create cards through a standalone CLI or clean API
- **AI grader**: Optional Claude-powered grading that keeps you honest during review (scores accuracy, gives brief feedback)
- **Future nice-to-have**: AI could have a short conversation about a card instead of just grading, or suggest breaking down cards you keep failing
- AI is a first-class integration but never a requirement

## CLI vision

Standalone CLI tool (`amber-cards`), not tied to any specific AI tool. Any AI agent (Claude, Cursor, Copilot, Windsurf) can use it. Paired with a Claude Code skill for the best experience, but the CLI itself is AI-agnostic.

Commands:
- `amber-cards login` — authenticate
- `amber-cards add "question" "answer"` — create a card
- `amber-cards review` — interactive review session in the terminal
- `amber-cards status` — how many cards are due

## Import / export

Easy JSON and CSV import/export in both directions. Respects data ownership. Also serves as a bulk import mechanism via CLI.

## Priorities (in order)

1. **CLI** — standalone tool any AI can use, unlocks everything
2. **Import/export** — JSON/CSV both directions, respects user data
3. **Simplify** — kill tags, polish the core review loop
4. **Mobile** — must have a great mobile experience, possibly a native app

## Deferred

- Self-hosting (nice-to-have later, not now — we host everything)
- Command palette (app is minimal enough to not need it yet)
- Decks (intentionally excluded, not a missing feature)
