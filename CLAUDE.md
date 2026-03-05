# Daily Review

A spaced repetition app that turns Claude Code conversations into flashcards.

## Project docs

See `docs/` for a project overview.

## Scripts

- `bun run dev` — Start dev server with auto-reload (nodemon + tsx)
- `bun run build` — Build client with Vite
- `bun start` — Start production server
- `bun run cli` — Run the CLI tool directly

## Conventions

- **Database migrations**: Always create migrations through the Supabase CLI, never by hand:
  - Create: `supabase migration new <name>` → generates a timestamped file in `supabase/migrations/`
  - Apply locally: `supabase migration up`
  - Apply remote: `supabase db push`
- **No linter or formatter** is configured — there is no ESLint, Prettier, or Biome
- **No test framework** is configured yet
