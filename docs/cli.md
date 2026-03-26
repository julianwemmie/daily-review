# CLI

Command-line tool for managing flashcards and running review sessions outside the web UI.

```
amber <command> [options]
```

## Authentication

Run `amber login` before using other commands. Two methods are available:

- **Browser login (default)**: `amber login` — opens a browser window using the OAuth device flow. Approve the code shown in the terminal and the session token is saved automatically.
- **API key**: `amber login --api-key` — prompts for an API key (generate one in the web app). Useful for headless environments.

You can also set the `AMBER_CARDS_API_KEY` env var to skip login entirely. See [Authentication](auth.md) for full details on auth resolution order.

## Commands

| Command | Description |
|---------|-------------|
| `login` | Authenticate (browser OAuth or `--api-key`) |
| `status` | Show counts of new and due cards |
| `upload [file]` | Create cards from a JSON file, inline flags, or interactively |
| `import <file>` | Import cards from Anki (`.apkg`), Mochi (`.mochi`), or Amber (`.json`) files |
| `list` | List cards (filter with `-s <status>` or `-q <query>`) |
| `review` | Interactive review session for due cards |
| `export` | Export all cards to a JSON file |
| `delete <ids...>` | Delete cards by ID (`--yes` to skip confirmation) |

### Claude Code Plugin

The auto-flashcard plugin is distributed as a Claude Code marketplace plugin. Install it with:

```bash
claude plugin marketplace add julianwemmie/amber-claude-plugin
claude plugin install amber-flashcards@amber
```

### upload

Accepts cards three ways:

1. **JSON file** — `amber upload cards.json` (array of `{front, back, tags?}`)
2. **Inline** — `amber upload --front "Question" --back "Answer" --tags "js,async"`
3. **Interactive** — `amber upload` with no arguments prompts for front, back, and tags

### export

```
amber export
amber export -o my-cards.json --no-include-review-history
```

Exports all cards to a JSON file (default: `amber-cards-export.json`). By default includes FSRS scheduling data and review history. Use `--no-include-scheduling` or `--no-include-review-history` to exclude them.

### import

```
amber import deck.apkg
amber import deck.mochi --tags "imported,history" --preserve-scheduling
amber import cards.json
```

Supports Anki (`.apkg`), Mochi (`.mochi`), and Amber (`.json`) files. `--tags <tags>` adds extra comma-separated tags to all imported cards. `--preserve-scheduling` attempts to map source scheduling data to FSRS parameters.

### review

Fetches due cards and walks through them one at a time. For each card you type an answer, optionally receive LLM grading feedback, then self-rate (Again / Hard / Good / Easy). Use `-n <count>` to cap the session length and `--no-grader` to skip LLM grading.

### list / status

Both support `--json` for machine-readable output.

## Configuration

Config is stored at `~/.amber-cards/config.json` with these fields:

| Field | Description |
|-------|-------------|
| `serverUrl` | API server URL (default: `http://localhost:3000`) |
| `apiKey` | Saved API key |
| `sessionToken` | Saved OAuth session token |

Override the server URL per-command with `--server <url>` or the `AMBER_CARDS_URL` env var.

## Global Options

Every command accepts `--api-key <key>` and `--server <url>` to override the saved config for that invocation.

## Related docs

- [Project overview](overview.md)
- [API reference](api.md)
- [Database schema](schema.md)
- [Authentication](auth.md)
- [Environment variables](env.md)
