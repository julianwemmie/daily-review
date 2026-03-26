---
status: done
type: feature
created: 2026-03-26
---

# Allow unauthenticated access with gated AI features

Make the app accessible to users who aren't logged in as a local-only demo mode.

## Decisions

- **Local-only, in-memory storage** — demo users get no server interaction. Cards live in a JavaScript object, lost on refresh. This is for demo purposes only.
- **Pre-loaded sample cards + user-created** — ship sample flashcards so users can try reviewing immediately; they can also create their own. All in-memory.
- **AI features gated with login modal** — three trigger points show a "log in to use AI" modal:
  1. Toggling AI grading mode on in review
  2. Attempting any AI grading action
  3. Clicking "Analyze" in CardStatsModal
- **Signup = clean start with warning** — signing up gives a fresh account. Demo cards are discarded. Show a warning that in-memory cards won't carry over.

## Implementation

1. **Bypass `AuthGate`** — let unauthenticated users into `AppLayout` instead of showing `AuthView`
2. **Storage provider abstraction** — define a common interface for card/deck operations. The API-backed provider (current behavior for logged-in users) and the in-memory provider (demo mode) should both implement it. The app picks the right provider based on auth state. This makes it easy to swap between client-side storage (memory, localStorage, IndexedDB) and remote/backend storage.
3. **`LoginPromptModal`** — new modal using the existing Radix Dialog component, triggered at the three AI action points
4. **Guard AI actions** — in `ReviewView` (AI mode toggle + evaluate) and `CardStatsModal` (analyze button)
5. **Signup warning** — alert users that demo cards won't migrate when they create an account
