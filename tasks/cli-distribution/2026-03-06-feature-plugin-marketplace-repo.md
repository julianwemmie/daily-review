---
status: open
type: feature
created: 2026-03-06
---

# Distribute Amber plugin via a Claude Code marketplace repo

Replace the current `install-plugin` CLI command with a proper Claude Code plugin marketplace hosted as a GitHub repo (`julianwemmie/amber-claude-plugin`).

## Why

The current `amber install-plugin --local` copies files into `.claude/plugins/` in the project directory, but Claude Code doesn't discover plugins there. Plugins must be installed through a marketplace or `--plugin-dir`. A marketplace repo is the cleanest approach — no custom installer to maintain, and users get automatic updates through Claude Code's built-in system.

## What to do

### 1. Create the `amber-claude-plugin` GitHub repo

Structure it as a marketplace where the repo root is also the plugin:

```
amber-claude-plugin/
├── .claude-plugin/
│   ├── plugin.json          # plugin manifest
│   └── marketplace.json     # marketplace catalog (source: ".")
├── skills/
│   └── flashcards/
│       └── SKILL.md
├── hooks/
│   └── hooks.json
├── scripts/
│   └── flashcard-gen.sh
└── README.md
```

`marketplace.json`:
```json
{
  "name": "amber",
  "owner": { "name": "Amber" },
  "plugins": [
    {
      "name": "amber-flashcards",
      "source": ".",
      "description": "Generate spaced repetition flashcards from Claude Code conversations",
      "version": "0.1.0"
    }
  ]
}
```

### 2. Remove `install-plugin` CLI command

Remove the `install-plugin` command from the Amber CLI.

### 3. Remove `.claude/plugins/` from this repo

The `.claude/plugins/amber-flashcards/` directory in this project is no longer needed.

### 4. Update docs

Tell users to install with two commands:

```bash
claude plugin marketplace add julianwemmie/amber-claude-plugin
claude plugin install amber-flashcards@amber
```
