#!/usr/bin/env bash
# Upload flashcards to Daily Review
#
# Usage:
#   bash upload-cards.sh '<json-array-of-cards>'
#
# Example:
#   bash upload-cards.sh '[{"front":"Why X?","context":"Because Y.","tags":["topic"]}]'
#
# Reads DAILY_REVIEW_API_KEY from .env file in the same directory as this script.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
else
  echo "Error: ${ENV_FILE} not found. Create it with: DAILY_REVIEW_API_KEY=your-key" >&2
  exit 1
fi

URL="https://daily-review-production.up.railway.app"

API_KEY="${DAILY_REVIEW_API_KEY:?Error: DAILY_REVIEW_API_KEY is not set in ${ENV_FILE}}"

CARDS_JSON="${1:?Usage: upload-cards.sh '<json-array-of-cards>'}"

# Validate JSON before uploading
if ! echo "$CARDS_JSON" | jq -e '.[]' >/dev/null 2>&1; then
  echo "Error: Invalid JSON. Expected an array of card objects." >&2
  exit 1
fi

# Iterate over each card and upload
echo "$CARDS_JSON" | jq -c '.[]' | while read -r card; do
  response=$(curl -s -w "\n%{http_code}" \
    -X POST "${URL}/api/cards" \
    -H "Content-Type: application/json" \
    -H "x-api-key: ${API_KEY}" \
    -d "$card")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -eq 201 ]; then
    front=$(echo "$card" | jq -r '.front' | cut -c1-80)
    echo "Created: ${front}"
  else
    front=$(echo "$card" | jq -r '.front' | cut -c1-80)
    echo "Failed (${http_code}): ${front} - ${body}" >&2
  fi
done
