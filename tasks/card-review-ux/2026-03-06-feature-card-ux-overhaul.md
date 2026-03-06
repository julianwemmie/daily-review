---
status: open
type: feature
created: 2026-03-06
---

# Card UX overhaul

Three independent improvements to the card experience, ordered by size. All work happens in the triage and review views.

## 1. Fix triage card carousel animation

**View:** TriageView.tsx

The card stack exit animation currently flies off to the right (`x: 300`). It should slide up off the stack instead.

- Change exit animation from `{ x: 300, opacity: 0 }` to `{ y: -100, opacity: 0 }`
- Animate arrow key navigation (up/down) so cards visually shuffle within the stack using the existing spring physics — currently it's an instant index swap
- Animation should work in both directions (forward and backward through the stack)
- Already using Framer Motion (`motion/react`) with `AnimatePresence` + `m.div` — no new dependencies needed

## 2. Click-to-edit in triage view

**View:** TriageView.tsx

Let users edit the front and back of AI-generated cards before accepting them. Currently the triage card is read-only.

- Default state is read-only (current behavior)
- Clicking on the front text swaps it to a textarea for editing
- Clicking "Show answer" reveals the back; clicking the back text swaps it to a textarea
- On Accept: save any edits via `updateCard` API (already supports `front`, `back`, `tags` patches), then accept
- On Discard: discard without saving edits
- Add a persistent muted hint ("click to edit") below the card — disappears after the user's first edit or after a few views
- No new API work needed — `updateCard` PATCH endpoint already exists

## 3. Voice input for card review

**View:** ReviewView.tsx

Add a mic button next to the answer textarea so users can speak their answers instead of typing.

**UX:**
- Mic icon button inside or beside the answer textarea
- Keyboard shortcut to toggle recording
- Tap to start recording, tap again to stop
- Transcribed text fills the textarea — user can edit before submitting
- Show a recording indicator (pulsing dot or similar) while active

**Tech:**
- Use OpenAI Whisper API for speech-to-text
- Code the STT layer to an interface so the provider can be swapped out later
- Frontend: `MediaRecorder` API to capture audio, send to a new backend endpoint
- Backend: new endpoint that proxies audio to Whisper and returns the transcript
