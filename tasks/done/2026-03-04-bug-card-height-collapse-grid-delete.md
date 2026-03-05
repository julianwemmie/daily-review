---
status: done
type: bug
created: 2026-03-04
---

# Card height collapses in grid view after deleting an imported card

Card height collapses in grid view after deleting an imported card that hasn't been triaged. The card container remains but shows no front text, leaving just the status/tag badges and empty space. Likely cause: some cards imported from Mochi Notes deck may have empty `front` field, or the grid card component doesn't handle missing front text gracefully.
