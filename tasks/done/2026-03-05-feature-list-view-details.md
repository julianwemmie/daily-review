---
status: done
type: feature
created: 2026-03-05
---

# Differentiate list view from grid view with more card details

Update the list view so it's visually distinct from grid view. Grid view should stay simple. List view should be a sortable data table showing scheduling metadata.

## Decisions

- **Layout:** Real data table with column headers, one row per card
- **Columns:** Front (single line, truncated with ellipsis), Status, Due, Reps, Tags
- **Sorting:** All columns sortable — click header to toggle asc/desc
- **Row click:** Opens the existing edit dialog
- **Actions:** No per-row edit/delete buttons — delete via bulk delete only
- **Due column:** Relative dates ("in 2d", "Overdue by 3d"), red text for overdue, dash for triaging cards
- **Overdue treatment:** Red/destructive text, but not for suspended cards
- **Grid view:** No changes — stays simple with flip cards
- **Mobile:** Fall back to existing card-based list (tables don't work on small screens)

## Implementation

1. Add helper functions for relative due date formatting
2. Add sort state (column + direction) with click-to-sort headers
3. Build the table layout: Front, Status, Due, Reps, Tags columns
4. Front column: single line truncated with text-ellipsis
5. Due column: relative dates, red for overdue active cards, dash for triaging
6. Row click opens existing edit dialog
7. Hide table on mobile, show existing card list instead
