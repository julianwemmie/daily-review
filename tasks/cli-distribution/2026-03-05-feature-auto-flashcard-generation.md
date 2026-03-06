---
status: open
type: feature
created: 2026-03-05
---

# Automatic flashcard generation via Stop hook

Add a Claude Code Stop hook that silently generates flashcards from conversations using a debounced timer.

## How it works

1. **Stop hook** fires on every Claude turn. If no timer is already pending, it spawns a background process with a ~10 min sleep. If a timer is already pending, it does nothing.
2. **When the timer fires**:
   - Read the full conversation JSONL
   - Fetch existing cards from the API (via `bun run cli list` or similar)
   - Send both to `claude --print` with a prompt: "here's the conversation, here are existing cards, generate any new ones that are missing"
   - Upload new cards via `bun run cli upload`
   - Clear the pending flag
3. Next Stop hook after processing starts a fresh cycle.

## Design decisions

- **Fully silent** — no in-conversation interruption, cards just appear in the app
- **No cursor or state files** — existing cards serve as the dedup mechanism. Full conversation is reprocessed each time.
- **Single timer** — only one pending timer at a time. Active conversation keeps the timer from firing; quiet periods trigger processing.
- **`claude --print`** — uses existing Claude Code subscription, no separate API key needed

## Distribution: Claude Code Plugin

Ship this as a Claude Code plugin so users can install with one command. All plugin files live in a subdirectory of this repo (e.g., `plugin/`).

### Plugin structure

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

### How it works

- `hooks/hooks.json` defines the Stop hook pointing to `scripts/flashcard-gen.sh`
- The script receives `transcript_path` and `session_id` via JSON on stdin
- Handles the debounce logic (check for pending timer, spawn background sleeper, process when stale)
- Uses `claude --print` for card generation, `bun run cli upload` for uploading

### Distribution

Two install paths:

1. **Via the CLI**: `bun run cli install-plugin` — copies the plugin files into `~/.claude/plugins/daily-review-flashcards/` and registers it. Also `bun run cli uninstall-plugin` to remove. This is the simplest path for users who already have the CLI.

2. **Via the Claude Code marketplace**: Publish the plugin subdirectory as its own GitHub repo, submit to the official Anthropic marketplace (https://github.com/anthropics/claude-plugins-official), users discover and install through the `/plugin` menu inside Claude Code.

### Why plugin over manual hook install

- Users install through the standard marketplace flow — no manual config editing
- Discoverable alongside other plugins
- Updatable — plugin updates pull new hook/script versions
- Clean uninstall via the plugin menu
- Bundles both the automatic hook and the manual `/flashcards` skill
