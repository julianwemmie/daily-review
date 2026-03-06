---
status: open
type: feature
created: 2026-03-05
---

# CLI Pipeline: Tests, Publish, Auto-Flashcards

Ship the CLI publicly and add automatic flashcard generation. Sequential pipeline — each section depends on the previous one.

## 1. Unit tests for CLI

Add unit tests covering the CLI. Tests must pass before npm publish.

- All 8 commands: login, upload, list, review, delete, export, import, status
- Happy path + error cases for each command
- Mock the API layer (`src/cli/api.ts`)
- Argument validation and routing in `main.ts`

## 2. Publish to npm

Publish the CLI to npm as `amber-cards`. Users install via `npm install -g amber-cards` and invoke with `amber`.

- Package name: `amber-cards`
- Binary name: `amber`
- Proper package.json `bin` field, README, types
- Update the Claude flashcards skill to use the npm-published CLI

## 3. Automatic flashcard generation (plugin)

Add a Claude Code Stop hook that silently generates flashcards from conversations using a debounced timer.

### How it works

1. **Stop hook** fires on every Claude turn. If no timer is already pending, it spawns a background process with a ~10 min sleep. If a timer is already pending, it does nothing.
2. **When the timer fires**:
   - Read the full conversation JSONL
   - Fetch existing cards from the API (via `amber list` or similar)
   - Send both to `claude --print` with a prompt: "here's the conversation, here are existing cards, generate any new ones that are missing"
   - Upload new cards via `amber upload`
   - Clear the pending flag
3. Next Stop hook after processing starts a fresh cycle.

### Design decisions

- **Fully silent** — no in-conversation interruption, cards just appear in the app
- **No cursor or state files** — existing cards serve as the dedup mechanism. Full conversation is reprocessed each time.
- **Single timer** — only one pending timer at a time. Active conversation keeps the timer from firing; quiet periods trigger processing.
- **`claude --print`** primary — uses existing Claude Code subscription, no separate API key needed
- **`ANTHROPIC_API_KEY` fallback** — optional, for users who prefer direct API access or CI usage
- **Error detection** — must surface clear feedback if Claude Code isn't installed or isn't authenticated

### Configuration

The plugin reads from a config file (e.g., `~/.amber/plugin.json` or similar):

- **`debounce_minutes`** — delay before processing (default: 10)
- **`included_directories`** — only generate cards from conversations in these dirs (default: all)
- **`excluded_directories`** — skip conversations in these dirs (default: none)

### Distribution: Claude Code Plugin

Ship as a Claude Code plugin. CLI install first, marketplace later.

#### Plugin structure

```
plugin/
├── .claude-plugin/
│   └── plugin.json          # name, version, description
├── hooks/
│   └── hooks.json           # Stop hook config
├── skills/
│   └── flashcards/
│       └── SKILL.md         # manual /flashcards skill
├── scripts/
│   └── flashcard-gen.sh     # debounced background processor
└── README.md
```

#### How it works

- `hooks/hooks.json` defines the Stop hook pointing to `scripts/flashcard-gen.sh`
- The script receives `transcript_path` and `session_id` via JSON on stdin
- Handles the debounce logic (check for pending timer, spawn background sleeper, process when stale)
- Uses `claude --print` for card generation, `amber upload` for uploading

#### Install paths

1. **Via the CLI**: `amber install-plugin` — copies the plugin files into `~/.claude/plugins/amber-flashcards/` and registers it. Also `amber uninstall-plugin` to remove.
2. **Via the Claude Code marketplace** (later): Publish the plugin subdirectory as its own GitHub repo, submit to the official Anthropic marketplace.
