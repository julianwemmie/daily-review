---
status: done
type: feature
created: 2026-03-04
---

# Export cards

Add an export feature so users can download their cards as a JSON file for backup/archive purposes.

## Plan

- **Format**: JSON with version metadata
- **Scope**: All cards for the user, with review logs included
- **Scheduling data**: Optional toggle (`includeScheduling`) — when off, only exports front/back/tags/status/createdAt
- **Surfaces**: Web UI (download button) + CLI (`daily-review export`)
- **API**: `GET /api/cards/export?includeScheduling=true`

### JSON structure

```json
{
  "exportedAt": "2026-03-05T...",
  "version": 1,
  "includesScheduling": true,
  "cards": [
    {
      "front": "...",
      "back": "...",
      "tags": ["python", "async"],
      "status": "active",
      "createdAt": "...",
      "state": "review",
      "due": "...",
      "stability": 12.3,
      "reviewLogs": [
        { "rating": "Good", "answer": "...", "llmScore": 0.85, "llmFeedback": "...", "reviewedAt": "..." }
      ]
    }
  ]
}
```

### Implementation steps

1. Add `GET /api/cards/export` endpoint with `?includeScheduling=true` query param
2. Add `daily-review export` CLI command with `--include-scheduling` flag
3. Add download button in the web UI
