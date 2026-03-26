# Amber

![Amber](planning/presentation_screenshot.png)

Aesthetic, opinionated flashcards with AI-powered grading and FSRS scheduling. Import from Anki or Mochi, create cards manually, or generate them automatically with the CLI and Claude Code plugin.

## CLI

Install the CLI to manage flashcards from your terminal:

```bash
npm install -g amber-cards
```

### Authenticate

```bash
amber login            # browser OAuth
amber login --api-key  # paste an API key instead
```

Or set the `AMBER_CARDS_API_KEY` environment variable.

### Commands

| Command | Description |
| --- | --- |
| `amber upload [file]` | Create cards from a JSON file or inline |
| `amber list` | List cards (supports `--status`, `--query`, `--json`) |
| `amber review` | Interactive spaced repetition session |
| `amber delete <ids...>` | Delete cards by ID |
| `amber import <file>` | Import from Anki (.apkg), Mochi (.mochi), or Amber (.json) |
| `amber export` | Export all cards to JSON |
| `amber status` | Show card counts and review status |
| `amber login` | Authenticate with the Amber server |

### Auto-flashcard plugin

Install the Claude Code plugin to automatically generate flashcards from your conversations:

```bash
# Add the marketplace and install the plugin
claude plugin marketplace add julianwemmie/amber-claude-plugin
claude plugin install amber-flashcards@amber
```

To uninstall:

```bash
claude plugin uninstall amber-flashcards@amber
```

Requires `claude` CLI or `ANTHROPIC_API_KEY`.

---

## Web App Development

### Tech Stack

- React 19, Vite, Tailwind CSS, Radix UI
- Express 5, TypeScript
- Supabase (Postgres), `pg`
- ts-fsrs (spaced repetition scheduling)
- better-auth (authentication)
- Anthropic SDK (LLM grading)

### Getting Started

1. Install dependencies: `bun install`
2. Copy `.env.example` to `.env` and fill in the values (see [docs/env.md](docs/env.md))
3. Start Supabase: `supabase start && supabase migration up`
4. Run the dev server: `bun run dev`

### Docs

See [`docs/`](docs/) for a project overview.
