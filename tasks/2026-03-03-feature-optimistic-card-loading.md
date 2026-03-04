---
status: open
type: feature
created: 2026-03-03
---

# Optimistic loading for cards between tabs

Fetch all cards (triage, due, list) on app mount so tab switches are instant. Background refetch keeps data fresh after mutations.

## Decisions

- **State**: TanStack React Query — caching, background refetch, stale-while-revalidate, deduplication
- **Fetch timing**: On AppLayout mount — all three datasets prefetched upfront
- **Invalidation**: After mutations (accept, review, delete), invalidate related queries; React Query refetches in background (stale-while-revalidate)
- **API**: Consolidate into single `GET /api/cards?view=triage|due|list` endpoint; backend handles filtering per view
- **Counts**: Replace CountsContext with a React Query `['cards', 'counts']` query; invalidate alongside card queries

## Implementation steps

1. Install `@tanstack/react-query`
2. Add `QueryClientProvider` in app root
3. Create new `GET /api/cards?view=triage|due|list` backend endpoint (consolidates existing fetch logic)
4. Create query hooks: `useCards(view)`, `useCounts()`
5. Prefetch all three views + counts in AppLayout via `queryClient.prefetchQuery`
6. Migrate TriageView, ReviewView, ListView to use `useCards(view)` hook
7. Update mutations (accept, review, delete, create) to invalidate relevant query keys
8. Remove CountsContext and old per-view fetch logic
9. Remove old dedicated endpoints once new consolidated one is stable
