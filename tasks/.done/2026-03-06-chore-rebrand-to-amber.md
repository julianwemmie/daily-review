---
status: done
type: chore
created: 2026-03-06
---

# Rebrand "Daily Review" to Amber

Rebrand the app from "Daily Review" to **Amber**. The primary URL will be `amber.cards`. Use `amber-cards` as the alternative name where `amber` alone isn't available (e.g., npm package name, GitHub repo, etc.).

## Decisions

| Decision | Choice |
|----------|--------|
| Display name (UI, emails, auth) | **Amber** |
| Package / bin name | `amber-cards` |
| CLI config directory | `~/.amber-cards/` |
| Env var prefix | `AMBER_CARDS_*` (`AMBER_CARDS_API_KEY`, `AMBER_CARDS_URL`) |
| Supabase project_id | `amber-cards` |
| Landing site domain | `amber.cards` |
| Config migration | None — re-login after rename |

## Scope — full sweep

### Code & config
- [x] `package.json` — name → `amber-cards`, bin → `amber-cards`
- [x] `index.html` — `<title>Amber</title>`
- [x] `supabase/config.toml` — project_id → `amber-cards`
- [x] `.env.example` — rename env vars

### CLI (`src/cli/`)
- [x] `config.ts` — config dir `~/.amber-cards/`, env vars `AMBER_CARDS_*`
- [x] `main.ts` — CLI name, description, help text
- [x] `commands/login.ts` — help text references
- [x] `commands/import.ts` — help text references
- [x] `commands/export.ts` — help text references

### Client UI (`src/client/`)
- [x] `App.tsx` — any branding strings
- [x] `views/AuthView.tsx` — sign-in page title/text
- [x] `views/DeviceView.tsx` — device auth text
- [x] `components/OnboardingModal.tsx` — welcome text
- [x] `components/ImportModal.tsx` — import text

### Server
- [x] `src/server/email-notifications.ts` — email templates
- [x] `src/shared/parsers/json-parser.ts` — any references

### Docs & planning
- [x] `README.md`
- [x] `CLAUDE.md`
- [x] `docs/overview.md`, `docs/auth.md`, `docs/schema.md`, `docs/cli.md`
- [x] `planning/` files (pitch, roadmap, vision, onboarding)

### Landing site (`site/`)
- [x] `site/src/pages/index.astro` + all `docs/*.mdx` pages
- [x] `site/src/components/` (Nav, Footer, Hero, Install)
- [x] `site/src/layouts/Docs.astro`

### Claude skills
- [x] `.claude/skills/flashcards/SKILL.md`

## Post-merge follow-ups
- Rename GitHub repo (`daily-review` → `amber-cards`)
- `supabase stop` → `supabase start` to pick up new project_id
- Re-login to CLI after config dir change
