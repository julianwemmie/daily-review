---
status: done
type: feature
created: 2026-03-04
---

# Create CLI for Daily Review

Build a comprehensive CLI for Daily Review that serves both humans (interactive use) and AI tools (programmatic use).

## Decisions

- **Location**: `src/cli/` — sibling to client/server/shared
- **Framework**: Commander + @clack/prompts
- **Data access**: HTTP API calls to the existing Express server
- **Auth**: API key (for AI tools / quick use) + browser OAuth flow (for human UX)
- **Invocation**: package script (`bun run cli`) + bin field in package.json (`daily-review`)

## Commands

- `upload` — push flashcards to the API (primary entry point for AI tools like the flashcard skill)
- `review` — interactive spaced repetition session in the terminal
- `list` — view cards with filtering/search
- `delete` / `remove` — remove cards
- Additional admin/utility commands as needed

## Structure

```
src/cli/
  main.ts          # entry point, Commander program setup
  commands/
    upload.ts
    review.ts
    list.ts
    delete.ts
```

## Dependencies

- `commander` — arg parsing, subcommands, help text
- `@clack/prompts` — interactive prompts, spinners, select menus
