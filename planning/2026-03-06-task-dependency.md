# Task Dependency Analysis

_Generated 2026-03-06 — 14 open tasks_

## Groups by Topic

### 1. CLI & Distribution (3 tasks)

| Task | Type | File |
|------|------|------|
| Unit tests for CLI | chore | `cli-distribution/2026-03-05-chore-unit-tests-cli.md` |
| Publish CLI to npm & update Claude skill | chore | `cli-distribution/2026-03-05-chore-cli-npm-publish.md` |
| Auto flashcard generation (plugin) | feature | `cli-distribution/2026-03-05-feature-auto-flashcard-generation.md` |

### 2. Branding & Navigation (3 tasks)

| Task | Type | File |
|------|------|------|
| Rebrand to Amber | chore | `branding-navigation/2026-03-06-chore-rebrand-to-amber.md` |
| Navigation restructure | chore | `branding-navigation/2026-03-06-chore-navigation-restructure.md` |
| Add favicon | feature | `branding-navigation/2026-03-04-feature-add-favicon.md` |

### 3. Card Review UX (3 tasks)

| Task | Type | File |
|------|------|------|
| Fix card carousel animation | fix | `card-review-ux/2026-03-05-fix-card-carousel-animation.md` |
| Show/edit front & back on new card | feature | `card-review-ux/2026-03-05-feature-new-card-front-back-view-edit.md` |
| Voice input for card review | feature | `card-review-ux/2026-03-06-feature-voice-input-card-review.md` |

### 4. AI & Analytics (3 tasks)

| Task | Type | File |
|------|------|------|
| AI answer consistency analysis | feature | `ai-analytics/2026-03-06-feature-ai-answer-consistency-analysis.md` |
| Stats dashboard | feature | `ai-analytics/2026-03-06-feature-stats-dashboard.md` |
| Explore card clusters | feature | `ai-analytics/2026-03-06-feature-explore-card-clusters.md` |

### 5. Standalone (2 tasks)

| Task | Type | File |
|------|------|------|
| Mobile friendly | feature | `2026-03-04-feature-mobile-friendly.md` |
| Preserve scheduling on import | feature | `2026-03-04-feature-preserve-scheduling-import.md` |

## Dependency Graph

```
rebrand-to-amber
├──► add-favicon  (favicon should use new brand)
├──► cli-npm-publish  (npm package should use new name "amber-cards")
│    ├──► auto-flashcard-generation  (plugin uses CLI for upload)
│    └── unit-tests-cli  (tests should pass before publish)
│
navigation-restructure  (rename List→Explore, default route→Review, conditional New tab)
└──► explore-card-clusters  (builds on the renamed Explore tab)

stats-dashboard ◄─── ai-answer-consistency-analysis  (consistency data feeds into stats)

(independent)
├── mobile-friendly  (do LAST — after major UI changes to avoid rework)
├── preserve-scheduling-import
├── fix-card-carousel-animation
├── new-card-front-back-view-edit
└── voice-input-card-review
```

## Recommended Execution Order

1. **`rebrand-to-amber`** — Do first. Touches app name, routes, package name. Doing it later means redoing work.
2. **`navigation-restructure`** — Rename List→Explore, default to Review, conditional New tab (consolidated).
3. **`add-favicon`** — After rebrand, since it should use the Amber identity.
4. **`unit-tests-cli`** → **`cli-npm-publish`** → **`auto-flashcard-generation`** — CLI pipeline in order.
5. **Card UX fixes** (`carousel-animation`, `front-back-view-edit`) — Independent, do anytime.
6. **AI & Analytics** (`stats-dashboard`, `ai-answer-consistency`, `explore-card-clusters`) — Bigger features, do after foundation is stable.
7. **`mobile-friendly`** — Do last, after all UI changes are settled.
