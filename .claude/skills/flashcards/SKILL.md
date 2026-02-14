---
description: Generate flashcards from today's conversations and upload them to Daily Review
context: fork
---

# Generate Flashcards from Today's Conversations

Read all of today's Claude Code conversations for this project, identify concepts worth retaining, generate flashcards, and upload them.

## Step 1: Find today's conversations

Conversation history is stored as JSONL files in `~/.claude/projects/`. The project directory name is the working directory path with `/` replaced by `-`.

For example, if the cwd is `/Users/alice/code/my-app`, conversations are in:
`~/.claude/projects/-Users-alice-code-my-app/`

Find all `.jsonl` files in the project directory that were modified today.

## Step 2: Read the conversations

Each line of a JSONL file is a JSON object. Messages with `"type": "user"` or `"type": "assistant"` contain the conversation content in `message.content`. Skip lines with other types (tool calls, metadata, file snapshots, etc.).

The files may be large. Read them and focus on extracting the substantive back-and-forth — what the user asked and what was explained.

## Step 3: Generate flashcards

From the conversation content, identify concepts worth turning into flashcards.

Each card has three fields:

- **front** (required): A clear question that tests *understanding*. Prefer "why" and "how" questions over definitions.
- **context** (required): Full explanation and reference material for the LLM grader to evaluate free-form answers. Never shown to the user — include everything the grader needs.
- **tags** (optional): Short topic tags (e.g., `["react", "hooks"]`).

### Guidelines

- Cards should test general, transferable knowledge — not project-specific implementation details
- One concept per card
- Context should be thorough since the LLM grader only sees front + context + user's answer
- Include code snippets in context when applicable
- Quality over quantity

### Bad cards (too project-specific)

- "What endpoint does our API use to create cards?"
- "What fields does the CreateCardBody schema validate?"

### Good cards (general knowledge)

- "Why is shallow prop comparison the default in React.memo instead of deep comparison?"
- "What problem does the FSRS algorithm solve compared to fixed-interval repetition?"

## Step 4: Upload

Build a JSON array of card objects and run the script directly — do NOT check environment variables, inspect the server, or verify prerequisites first. Just run it:

```bash
bash .claude/skills/flashcards/upload-cards.sh '<json-array>'
```

The script handles its own validation and will produce a clear error if anything is wrong.

If the script fails because `DAILY_REVIEW_API_KEY` is not set, **stop and tell the user**. Do NOT save cards to files or try workarounds. Just relay the error and tell them to:

1. Go to the Daily Review app and generate an API key from the user menu
2. Add it to their shell profile (`~/.zshrc` or `~/.bashrc`):
   ```bash
   export DAILY_REVIEW_API_KEY="their-key-here"
   ```
3. Restart their terminal (or `source ~/.zshrc`)

## Output

List every card you created (just the fronts).
