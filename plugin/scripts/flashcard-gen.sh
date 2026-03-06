#!/usr/bin/env bash
# flashcard-gen.sh — Debounced automatic flashcard generation
#
# Called by the Claude Code Stop hook on every assistant turn.
# Spawns a background timer; when it fires (after debounce period),
# reads the conversation, generates new flashcards via claude --print,
# and uploads them via `amber upload`.
#
# Config: <plugin-dir>/config.json (optional)
#   { "debounce_minutes": 10, "included_directories": [], "excluded_directories": [] }

set -euo pipefail

# --- Logging ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PLUGIN_DIR/flashcard-gen.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# --- Read hook input from stdin ---
# Stop hooks receive JSON on stdin with transcript_path and session_id
INPUT=$(cat)
TRANSCRIPT_PATH=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(d).transcript_path||'')}catch{}})" 2>/dev/null || true)
SESSION_ID=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(d).session_id||'')}catch{}})" 2>/dev/null || true)

if [ -z "$TRANSCRIPT_PATH" ]; then
  exit 0
fi

# --- Config ---
CONFIG_FILE="$PLUGIN_DIR/config.json"
DEBOUNCE_MINUTES=10
INCLUDED_DIRS=""
EXCLUDED_DIRS=""

if [ -f "$CONFIG_FILE" ]; then
  eval "$(node -e "
    const c=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'));
    if(c.debounce_minutes!=null) console.log('DEBOUNCE_MINUTES='+Number(c.debounce_minutes));
    if(Array.isArray(c.included_directories)) console.log('INCLUDED_DIRS='+JSON.stringify(c.included_directories.join(',')));
    if(Array.isArray(c.excluded_directories)) console.log('EXCLUDED_DIRS='+JSON.stringify(c.excluded_directories.join(',')));
  " 2>/dev/null || true)"
fi

[ -z "$DEBOUNCE_MINUTES" ] && DEBOUNCE_MINUTES=10

# --- Directory filtering ---
CWD=$(pwd)

if [ -n "$EXCLUDED_DIRS" ]; then
  IFS=',' read -ra _dirs <<< "$EXCLUDED_DIRS"
  for dir in "${_dirs[@]}"; do
    if [[ "$CWD" == "$dir"* ]]; then
      exit 0
    fi
  done
fi

if [ -n "$INCLUDED_DIRS" ]; then
  MATCHED=false
  IFS=',' read -ra _dirs <<< "$INCLUDED_DIRS"
  for dir in "${_dirs[@]}"; do
    if [[ "$CWD" == "$dir"* ]]; then
      MATCHED=true
      break
    fi
  done
  if [ "$MATCHED" = false ]; then
    exit 0
  fi
fi

# --- Debounce: one pending timer per session ---
LOCK_DIR="$PLUGIN_DIR/locks"
mkdir -p "$LOCK_DIR"
LOCK_FILE="$LOCK_DIR/flashcard-gen-${SESSION_ID:-default}.lock"

if [ -f "$LOCK_FILE" ]; then
  # Timer already pending — do nothing
  exit 0
fi

# Mark timer as pending
echo "$$" > "$LOCK_FILE"

# --- Spawn background processor ---
(
  sleep $((DEBOUNCE_MINUTES * 60))

  # Verify lock is still ours (hasn't been cleared by a previous run)
  if [ ! -f "$LOCK_FILE" ]; then
    exit 0
  fi

  # --- Check prerequisites ---
  if ! command -v amber &>/dev/null; then
    log "ERROR: 'amber' CLI not found. Install with: npm install -g amber-cards"
    rm -f "$LOCK_FILE"
    exit 1
  fi

  # Check for claude (--print mode) or ANTHROPIC_API_KEY
  USE_CLAUDE_PRINT=false
  if command -v claude &>/dev/null; then
    USE_CLAUDE_PRINT=true
  elif [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    log "ERROR: Neither 'claude' CLI nor ANTHROPIC_API_KEY found. Cannot generate cards."
    rm -f "$LOCK_FILE"
    exit 1
  fi

  # --- Read the conversation ---
  if [ ! -f "$TRANSCRIPT_PATH" ]; then
    rm -f "$LOCK_FILE"
    exit 0
  fi

  # --- Fetch existing cards for dedup ---
  EXISTING_CARDS=$(amber list --json 2>/dev/null || echo "[]")

  # --- Build the prompt (written to a file to avoid ARG_MAX limits) ---
  PROMPT_FILE=$(mktemp /tmp/amber-prompt-XXXXXX.txt)
  cat > "$PROMPT_FILE" << 'PROMPT_HEADER'
You are a flashcard generator for a spaced repetition app called Amber.

You will receive:
1. A Claude Code conversation transcript (JSONL format)
2. A list of existing flashcards already in the user's collection

Your job: identify concepts from the conversation worth retaining as flashcards, then output ONLY new cards that don't duplicate existing ones.

Each card has:
- front (required): A question testing understanding. Prefer 'why' and 'how' over definitions.
- back (required): Context and explanation for the LLM grader. Include everything needed to evaluate a free-form answer.
- tags (optional): Short topic tags.

Rules:
- Test general, transferable knowledge — NOT project-specific implementation details
- One concept per card
- Quality over quantity — only create cards for genuinely useful concepts
- Skip anything already covered by existing cards (check fronts for semantic overlap)
- Output valid JSON array only, no other text

EXISTING CARDS:
PROMPT_HEADER
  echo "$EXISTING_CARDS" >> "$PROMPT_FILE"
  echo "" >> "$PROMPT_FILE"
  echo "CONVERSATION:" >> "$PROMPT_FILE"
  cat "$TRANSCRIPT_PATH" >> "$PROMPT_FILE"

  # --- Generate cards ---
  TMPFILE=$(mktemp /tmp/amber-flashcards-XXXXXX.json)

  if [ "$USE_CLAUDE_PRINT" = true ]; then
    claude --print < "$PROMPT_FILE" > "$TMPFILE" 2>/dev/null
  else
    # Fallback: direct API call with ANTHROPIC_API_KEY
    # Use node to safely JSON-encode the prompt and build the request body
    node -e "
      const fs = require('fs');
      const prompt = fs.readFileSync('$PROMPT_FILE', 'utf8');
      const body = JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{role: 'user', content: prompt}]
      });
      process.stdout.write(body);
    " > /tmp/amber-api-body-$$.json 2>/dev/null

    RESPONSE=$(curl -s https://api.anthropic.com/v1/messages \
      -H "x-api-key: $ANTHROPIC_API_KEY" \
      -H "anthropic-version: 2023-06-01" \
      -H "content-type: application/json" \
      -d @/tmp/amber-api-body-$$.json)
    rm -f /tmp/amber-api-body-$$.json

    echo "$RESPONSE" | node -e "
      let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
        try{const r=JSON.parse(d);process.stdout.write(r.content[0].text)}catch{}
      })
    " > "$TMPFILE" 2>/dev/null
  fi

  rm -f "$PROMPT_FILE"

  # --- Validate and upload ---
  CARD_COUNT=$(node -e "
    try{const c=JSON.parse(require('fs').readFileSync('$TMPFILE','utf8'));
    if(Array.isArray(c)&&c.length>0){process.stdout.write(String(c.length))}else{process.exit(1)}}
    catch{process.exit(1)}
  " 2>/dev/null) && \
    amber upload "$TMPFILE" 2>/dev/null && \
    log "Uploaded $CARD_COUNT new cards" || \
    log "ERROR: Upload failed or no valid cards generated"

  rm -f "$TMPFILE"
  rm -f "$LOCK_FILE"
) &

# Detach from the hook — don't block Claude Code
disown
exit 0
