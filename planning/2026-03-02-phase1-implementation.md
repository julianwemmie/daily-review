# Phase 1 Implementation Plan

Phase 1 has two workstreams: **data model rework** (`context` → `back`) and **UX completeness** (triage, self-grade, search). The data model change touches every layer, so it goes first.

---

## 1. Rename `context` → `back` (database migration)

**File:** New migration in `supabase/migrations/`

- `ALTER TABLE cards RENAME COLUMN context TO back;`
- Single non-destructive migration. Existing data carries over as-is.

---

## 2. Update shared types

**File:** `src/shared/types.ts`

- Rename `context: string | null` → `back: string | null` on the `Card` interface
- This will surface every downstream reference as a type error, making it easy to find all the spots that need updating.

---

## 3. Update server layer

**Files:**
- `src/server/routes.ts` — Update `CreateCardBody` and `UpdateCardBody` Zod schemas (`context` → `back`), update all references in route handlers
- `src/server/db/supabase-provider.ts` — Update any explicit column references (mostly passthrough, but `rowToCard` and query builders may reference `context`)
- `src/server/db/db-provider.ts` — Update `CardEdit` type and interface
- `src/server/grader/anthropic.ts` — Rename the `context` parameter to `back` in the `evaluate()` signature; update the system prompt to say "REFERENCE ANSWER" or "BACK" instead of "CONTEXT"
- `src/server/grader/llm.ts` — Update the `LlmGrader` interface signature

---

## 4. Update client layer for the rename

**Files:**
- `src/client/lib/api.ts` — Update `createCard`, `evaluateCard`, and any types referencing `context`
- `src/client/views/UploadView.tsx` — Rename the "Context" form field label to "Back" (and update the field name)
- `src/client/views/ListView.tsx` — If it displays `context` anywhere, rename

---

## 5. Show `back` after answering in ReviewView

**File:** `src/client/views/ReviewView.tsx`

This is the key behavior change. Currently, `context` is never shown to the user. Now:
- After the user submits their answer (either via LLM grading or self-grade), reveal the card's `back` field below the question
- Render it as markdown (cards store markdown strings, so use a simple markdown renderer or just `whitespace-pre-wrap` for v1)
- This gives the user the "flip the card" experience — they see the reference answer and can judge how they did

---

## 6. Make `front` and `back` editable on any card

**File:** New or updated component, likely in `src/client/views/ListView.tsx` or a new `CardEditDialog` component

- Add an edit button per card in ListView
- Opens an inline form or dialog with editable `front` and `back` fields
- Saves via `PATCH /api/cards/:id` (endpoint already supports updating `front` and `context`/`back`)
- Keyboard shortcut: `e` to edit the focused card (nice-to-have)

---

## 7. Improve triage flow — browse/cycle with accept/discard

**File:** `src/client/views/TriageView.tsx`

Current state: shows one card at a time, accept or skip. The roadmap asks for browse/cycle through proposed cards.

Changes:
- Fetch all `status="triaging"` cards upfront (already done via `fetchCards({ status: "triaging" })`)
- Show a card counter ("3 of 12") and allow cycling forward/back through the deck with `←`/`→` keys
- Each card shows `front` and `back` so the user can preview the answer before deciding
- Accept button → `PATCH status="active"` (existing)
- Discard button → `DELETE /api/cards/:id` (use delete, not suspend — "discard" implies permanent removal of a bad card; skip/suspend is already handled)
- After acting on a card, auto-advance to the next one
- "Accept All" / "Discard All" bulk actions at the top for efficiency

---

## 8. Self-grade option in ReviewView

**File:** `src/client/views/ReviewView.tsx`

Current flow: type answer → Cmd+Enter to evaluate with LLM → see score → pick rating (1-4).

Add a self-grade alternative:
- After the user types their answer, show two buttons: "AI Grade" (existing) and "Self Grade"
- **AI Grade**: existing flow, calls `/api/cards/:id/evaluate`, shows score + feedback, then rating buttons
- **Self Grade**: skips the LLM call, immediately reveals the `back` field and shows the 4 rating buttons (Again/Hard/Good/Easy)
- When self-grading, call `/api/cards/:id/review` with just the rating (no `llm_score` or `llm_feedback`) — the endpoint already accepts these as optional
- Keyboard shortcut: `Cmd+Enter` for AI grade (existing), `Enter` for self-grade

---

## 9. Card search and filtering in ListView

**File:** `src/client/views/ListView.tsx` + `src/server/routes.ts` + `src/server/db/supabase-provider.ts`

**Backend:**
- Add query params to `GET /api/cards`: `?q=search_term` for text search on `front` and `back`
- Use Postgres `ILIKE` for simple substring matching (good enough for v1; full-text search can come later)
- Existing `status` filter already works

**Frontend:**
- Add a search input at the top of ListView
- Debounce input (300ms) and pass as query param
- Add filter tabs or dropdown for status: All / Triaging / Active / Suspended
- Show result count

---

## Implementation order

| Step | What | Why this order |
|------|------|---------------|
| 1 | DB migration (`context` → `back`) | Foundation — everything else builds on this |
| 2-4 | Type + server + client rename | Follow the type errors, fix everything at once |
| 5 | Show `back` after answering | Core value-add of the rename |
| 6 | Card editing in ListView | Natural next step — users can now see `back`, they'll want to edit it |
| 7 | Triage flow improvements | Independent of 5-6, can be parallelized |
| 8 | Self-grade option | Independent, can be parallelized with 7 |
| 9 | Search and filtering | Independent, can be done last |

Steps 7, 8, and 9 are independent of each other and can be built in parallel or in any order.
