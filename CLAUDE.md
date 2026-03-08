# Amber

A beautiful, opinionated spaced repetition app with AI-powered grading and FSRS scheduling. Supports manual card creation, Anki/Mochi import, and automatic card generation via CLI and Claude Code plugin.

## Project docs

See `docs/` for a project overview.

## Scripts

- `bun run dev` — Start dev server with auto-reload (nodemon + tsx)
- `bun run build` — Build client with Vite
- `bun start` — Start production server
- `bun run cli` — Run the CLI tool directly

## Deployment

- **App** (`app.amber.cards`): Deployed on Railway
- **Site** (`amber.cards`): Deployed on Netlify — auto-deploys from `site/` on push to main
- **Claude Code plugin**: Published via a custom marketplace in a GitHub repo

## Conventions

- **Database migrations**: Always create migrations through the Supabase CLI, never by hand:
  - Create: `supabase migration new <name>` → generates a timestamped file in `supabase/migrations/`
  - Apply locally: `supabase migration up`
  - Apply remote: `supabase db push`
- **No linter or formatter** is configured — there is no ESLint, Prettier, or Biome
- **Testing**: Vitest — run `bun run test` or `bun run test:watch`
