#!/usr/bin/env bash
# Upload flashcards to Daily Review
#
# Usage:
#   bash upload-cards.sh '<json-array-of-cards>'
#
# Example:
#   bash upload-cards.sh '[{"front":"Why X?","context":"Because Y.","tags":["topic"]}]'
#
# Environment variables (required):
#   DAILY_REVIEW_API_KEY - API key generated from the Daily Review user menu

set -euo pipefail

# TODO: Replace with your deployed Daily Review URL
URL="http://localhost:3000"

API_KEY="${DAILY_REVIEW_API_KEY:?Error: DAILY_REVIEW_API_KEY is not set. Generate an API key from the Daily Review app (user menu) and add it to your shell profile: export DAILY_REVIEW_API_KEY=\"your-key\"}"

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
