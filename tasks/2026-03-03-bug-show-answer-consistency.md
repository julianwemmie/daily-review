---
status: open
type: bug
created: 2026-03-03
---

# Make show-answer style consistent between New and List tabs

The "show answer" UI in the New tab (TriageView) differs from the List tab (ListView). Standardize on the **List tab style**:

- Full-width dashed border button with "SHOW ANSWER" text
- Toggleable (click revealed content to hide it again)
- Hover effect (`hover:bg-muted/50`)
- `p-3` padding, `w-full`

**What to change:** Update `TriageView.tsx` to match the ListView pattern — replace the ghost `Button` with the dashed border `<button>`, and make the revealed back content clickable to re-hide.
