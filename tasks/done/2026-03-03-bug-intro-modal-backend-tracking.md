---
status: done
type: bug
created: 2026-03-03
---

# Intro modal pops up incorrectly in private/incognito windows

The intro modal appears every time a private window is opened, suggesting it's only being tracked at the browser level (likely localStorage). The "has seen intro" state should be tracked per-user on the backend so it persists across sessions and browser contexts.
