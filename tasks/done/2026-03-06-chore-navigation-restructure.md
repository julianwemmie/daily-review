---
status: done
type: chore
created: 2026-03-06
---

# Navigation Restructure

Restructure the tab bar and routing: rename List to Explore, make Review the default, and conditionally show the New tab.

## 1. Rename List to Explore

Rename the "List" tab to "Explore" and update the route from `/list` to `/explore`.

- [ ] `src/client/lib/routes.ts` — `list: "/list"` → `explore: "/explore"`
- [ ] `src/client/App.tsx` — update TAB_ROUTES label and route key
- [ ] Rename `ListView.tsx` → `ExploreView.tsx` (or just update the label — TBD)

## 2. Swap default route to Review

Make Review the default landing page at `/`. Move triage to `/new`.

- [ ] `src/client/lib/routes.ts` — `review: "/"`, `triage: "/new"`
- [ ] `src/client/App.tsx` — update catch-all `<Navigate to={ROUTES.review} />`

## 3. Conditional New tab

Only show the "New" tab when new card count > 0. Show a "done" state when the last card is triaged.

- [ ] `src/client/App.tsx` — filter New tab from TAB_ROUTES based on count
- [ ] `src/client/views/TriageView.tsx` — add "All caught up!" empty state
- [ ] Arrow key hotkeys should skip the New tab when hidden

## Tab order & URL structure

```
Tab bar:
[ Explore ][ Review (12) ]              [ Create ]   <- no new cards
[ Explore ][ Review (12) ][ New (3) ]   [ Create ]   <- new cards exist

Routes:
/         -> Review (default)
/new      -> Triage (new cards)
/explore  -> Explore (was List)
/create   -> Create
/device   -> Device auth
```
