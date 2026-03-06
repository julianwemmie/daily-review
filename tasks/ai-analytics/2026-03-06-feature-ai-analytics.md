---
status: open
type: feature
created: 2026-03-06
---

# AI & Analytics

Combined feature: Home tab stats dashboard + per-card stats modal with AI quality analysis.

## Part 1: Home Tab

New tab called "Home" — the first tab in nav. Shows high-level stats at a glance.

**GitHub-style contribution grid**
- Calendar heatmap of review activity (green squares for days reviewed)
- Data source: `review_logs.reviewed_at` grouped by date

**Big stat cards**
- Total cards (active)
- Current review streak (consecutive days)
- Longest streak
- Total reviews all-time
- Average llm_score (overall accuracy)

## Part 2: Card Stats Modal (in Explore tab)

Clicking a card in the Explore list opens a **Card Stats modal** (replaces the current edit-modal-on-click behavior). Edit modal moves to the three-dots dropdown menu.

**Instant data (no AI, loads immediately)**
- Summary stats: avg llm_score, total reviews, lapses, FSRS state, next due date
- Review history timeline: date, rating (Again/Hard/Good/Easy), llm_score, answer text

**AI quality analysis (on demand)**
- "Analyze" button in the modal
- Sends card front/back + all past answers to Claude
- Returns a quality/depth assessment: are answers getting lazier over time? Are they still showing real understanding, or just pattern-matching?
- Per-card granularity only
- No caching needed initially — can add later if it's slow/expensive

## API Endpoints Needed

- `GET /api/stats` — Home tab aggregate data (streaks, totals, contribution grid)
- `GET /api/cards/:id/review-logs` — Review history for card stats modal
- `POST /api/cards/:id/analyze` — AI quality/consistency analysis

## Implementation Order

1. Home tab with stats (new route, new API endpoint, contribution grid component)
2. Card Stats modal in Explore (new modal, review logs endpoint, rework click behavior)
3. AI analysis button inside Card Stats modal (new API endpoint, Claude integration)

## Open Questions

- Should `/` default to Home or stay on Review?
- Cache AI analysis results? (simple `last_analysis` JSON column on cards, or skip for now)
- Score threshold for proactive "your answers are getting lazy" nudge vs. only on-demand?
