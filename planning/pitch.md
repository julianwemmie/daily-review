# Daily Review, Week 5 Pitch

## What's Being Built

Daily Review is a spaced repetition app that turns Claude Code conversations into flashcards. A Claude Code skill (`/flashcards`) parses coding sessions, extracts key concepts, and generates cards. Users review them through a web UI where they answer in free-form text. An LLM grader scores the response instead of comparing against a rigid answer. FSRS handles the scheduling.

**Stack:** React, Express, Postgres (Supabase), BetterAuth, Tailwind/shadcn, ts-fsrs, deployed on Railway.

**Current state:** Deployed and functional as an MVP. The core loop works: card generation, upload, review, and FSRS scheduling are all in place. Auth works. There's a live URL.

## What "Finished" Looks Like

The MVP works, but it doesn't feel like a product worth using every day. "Finished" means closing that gap. Concretely:

**UX completeness:**
- Skip and preview cards during the new-card triage flow
- Make AI-graded review optional (let users self-grade if they prefer)
- Add card search/filtering to find and manage cards
- Polish the card generation skill (it was the last thing added and was rushed)

**Visual polish:**
- Animations and transitions (card flips, page transitions, loading states)
- Proper empty states, error states, and loading skeletons
- Mobile responsiveness (should work well on a phone)
- Consistent, considered visual design throughout

**Engineering quality:**
- Tests (there are currently zero)
- CI/CD pipeline (GitHub Actions: test on push, deploy on merge)
- Proper error handling across the stack
- Third-party auth providers (GitHub/Google via BetterAuth)

**The bar:** A stranger hitting the URL should be able to sign up, understand what the app does, generate cards, and review them without hitting any rough edges or dead ends.
