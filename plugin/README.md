# Amber Flashcards Plugin

A Claude Code plugin that automatically generates spaced repetition flashcards from your conversations.

## How it works

A **Stop hook** fires after each Claude turn. If no timer is pending, it starts a background timer (default: 10 minutes). When the timer fires:

1. Reads the full conversation transcript
2. Fetches your existing cards via `amber list`
3. Sends both to `claude --print` to generate new cards (deduped against existing ones)
4. Uploads new cards via `amber upload`

Cards appear silently in the Amber web app — no in-conversation interruption.

## Install

```bash
# Install the CLI first
npm install -g amber-cards
amber login

# Install the plugin
amber install-plugin
```

## Uninstall

```bash
amber uninstall-plugin
```

## Configuration

Create `config.json` in the plugin directory:

```json
{
  "debounce_minutes": 10,
  "included_directories": [],
  "excluded_directories": []
}
```

- **debounce_minutes** — Quiet period before processing (default: 10)
- **included_directories** — Only generate from conversations in these dirs (default: all)
- **excluded_directories** — Skip conversations in these dirs (default: none)

## Requirements

- `amber` CLI installed and authenticated
- One of:
  - `claude` CLI (uses `claude --print` — no extra API key needed)
  - `ANTHROPIC_API_KEY` environment variable (direct API fallback)
