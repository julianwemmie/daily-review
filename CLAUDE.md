# Daily Review

A spaced repetition app that turns Claude Code conversations into flashcards.

## Project docs

See `docs/` for a project overview.

## Conventions

- **Database migrations**: Always create migrations through the Supabase CLI, never by hand:
  - Create: `supabase migration new <name>` → generates a timestamped file in `supabase/migrations/`
  - Apply locally: `supabase migration up`
  - Apply remote: `supabase db push`
