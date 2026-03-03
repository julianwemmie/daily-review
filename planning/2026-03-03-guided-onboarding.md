# Implementation Plan: Guided Onboarding Modal

## Overview

A 3-step welcome modal shown on first registration + a "Help" item in the profile dropdown to reopen it. Purely informational — no actions, no seed cards.

## Decision: How to detect first login

**Use `localStorage`** — set a `onboarding_dismissed` key when the user closes the modal. If it's missing, show the modal.

Why not a DB column?
- Avoids a migration + API endpoint for a simple boolean
- If a user clears storage or uses a new device, they just see the modal again — that's fine, not harmful
- Keeps the feature entirely client-side

## Files to create

### `src/client/components/OnboardingModal.tsx`

New component. A multi-step Dialog with 3 pages and Next/Back/Done navigation.

**Props:**
```ts
{ open: boolean; onOpenChange: (open: boolean) => void }
```

**Internal state:** `step` (0 | 1 | 2)

**Step content:**

| Step | Title | Content |
|------|-------|---------|
| 0 | Welcome to Daily Review | Brief explanation: spaced repetition app that turns your Claude Code conversations into flashcards. Cards surface at optimal intervals so you retain what you learn. |
| 1 | The Core Loop | Three-phase explanation: **Generate** (use `/flashcards` in Claude Code after a conversation) → **Triage** (review generated cards in the New tab — accept or discard) → **Review** (answer cards when they're due, get AI feedback) |
| 2 | Setting Up Claude Code | Explain: 1) Generate an API key from the profile menu, 2) The `/flashcards` skill in Claude Code will use this key to upload cards, 3) After a coding session run `/flashcards` to generate cards from your conversation |

**Footer:** Step dots (indicators) + Back / Next / Done buttons. "Done" on the final step closes the modal and sets `localStorage.setItem("onboarding_dismissed", "true")`.

**UI approach:**
- Use existing `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` from `@/components/ui/dialog`
- Use `Button` from `@/components/ui/button`
- Step indicators: 3 small dots, active one highlighted
- Width: `sm:max-w-lg` (same as default DialogContent)

## Files to modify

### `src/client/App.tsx`

In `AppLayout`:

1. Add state: `const [onboardingOpen, setOnboardingOpen] = useState(false)`
2. Add `useEffect` on mount: if `!localStorage.getItem("onboarding_dismissed")`, set `onboardingOpen` to `true`
3. When `onOpenChange` is called with `false`, write `localStorage.setItem("onboarding_dismissed", "true")`
4. Pass `onHelpClick={() => setOnboardingOpen(true)}` prop to `<UserMenu />`
5. Render `<OnboardingModal open={onboardingOpen} onOpenChange={...} />` alongside the existing layout

### `src/client/components/UserMenu.tsx`

1. Accept new prop: `onHelpClick?: () => void`
2. Add a "Help" `DropdownMenuItem` between the "Generate API key" item and the sign-out separator
3. Use `HelpCircle` icon from `lucide-react`

```tsx
<DropdownMenuItem onSelect={() => onHelpClick?.()}>
  <HelpCircle className="mr-2 h-4 w-4" />
  Help
</DropdownMenuItem>
```

## Implementation order

1. Create `OnboardingModal.tsx` with the 3 steps and navigation
2. Wire it into `AppLayout` (state + localStorage check + render)
3. Add "Help" menu item to `UserMenu`
4. Test: sign up as new user → modal appears → dismiss → reload → modal doesn't appear → click Help in dropdown → modal reappears

## What we're NOT doing

- No database migration / `onboarding_completed` column
- No seed cards
- No interactive tutorial (just informational)
- No screenshots or images in the modal (text only)
- No link/redirect to the API key dialog from the modal
