---
status: done
type: feature
created: 2026-03-03
---

# Remove card titles from review and new card views

Right now there's a card title ("Review" / "New Card") and then the front is shown as text, but the spacing feels off.

**Decision:** Remove the `CardHeader`/`CardTitle` entirely from both views. Just show the front text directly in the card content. No labels on the back/reference answer either — the dashed border is enough.

**Affected files:**
- `src/client/views/ReviewView.tsx` — remove "Review" title
- `src/client/views/TriageView.tsx` — remove "New Card" title
