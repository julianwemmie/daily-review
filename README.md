# Amber

A spaced repetition app that turns Claude Code conversations into flashcards.

## Tech Stack

- React 19, Vite, Tailwind CSS, shadcn/ui
- Express 5, TypeScript
- Supabase (Postgres), `pg`
- ts-fsrs (spaced repetition scheduling)
- better-auth (authentication)
- Anthropic SDK (LLM grading)

## Getting Started

### 1. Install dependencies

```sh
npm install
```

### 2. Set up environment variables

```sh
cp .env.example .env
```

Fill in the values:

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Supabase API URL (default `http://127.0.0.1:54321` for local) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ANTHROPIC_API_KEY` | Anthropic API key for LLM grading |
| `BETTER_AUTH_SECRET` | Secret for better-auth session signing |
| `BETTER_AUTH_URL` | Public URL for auth callbacks |
| `DATABASE_URL` | Postgres connection string |
| `PORT` | Server port |
| `VITE_APP_URL` | Public app URL (used client-side) |

### 3. Set up Supabase locally

```sh
supabase start
supabase migration up
```

### 4. Run the dev server

```sh
npm run dev
```

## Scripts

| Script | Command | Description |
| --- | --- | --- |
| `dev` | `nodemon -w src/server -x tsx src/server/main.ts` | Start dev server with auto-reload |
| `start` | `NODE_ENV=production tsx src/server/main.ts` | Start production server |
| `build` | `vite build` | Build client bundle |

## Docs

See [`docs/`](docs/) for a project overview.
