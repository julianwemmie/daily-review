---
status: open
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
- [ ] `package.json` — name → `amber-cards`, bin → `amber-cards`
- [ ] `index.html` — `<title>Amber</title>`
- [ ] `supabase/config.toml` — project_id → `amber-cards`
- [ ] `.env.example` — rename env vars

### CLI (`src/cli/`)
- [ ] `config.ts` — config dir `~/.amber-cards/`, env vars `AMBER_CARDS_*`
- [ ] `main.ts` — CLI name, description, help text
- [ ] `commands/login.ts` — help text references
- [ ] `commands/import.ts` — help text references
- [ ] `commands/export.ts` — help text references

### Client UI (`src/client/`)
- [ ] `App.tsx` — any branding strings
- [ ] `views/AuthView.tsx` — sign-in page title/text
- [ ] `views/DeviceView.tsx` — device auth text
- [ ] `components/OnboardingModal.tsx` — welcome text
- [ ] `components/ImportModal.tsx` — import text

### Server
- [ ] `src/server/email-notifications.ts` — email templates
- [ ] `src/shared/parsers/json-parser.ts` — any references

### Docs & planning
- [ ] `README.md`
- [ ] `CLAUDE.md`
- [ ] `docs/overview.md`, `docs/auth.md`, `docs/schema.md`, `docs/cli.md`
- [ ] `planning/` files (pitch, roadmap, vision, onboarding)

### Landing site (`site/`)
- [ ] `site/src/pages/index.astro` + all `docs/*.mdx` pages
- [ ] `site/src/components/` (Nav, Footer, Hero, Install)
- [ ] `site/src/layouts/Docs.astro`

### Claude skills
- [ ] `.claude/skills/flashcards/SKILL.md`

## Post-merge follow-ups
- Rename GitHub repo (`daily-review` → `amber-cards`)
- `supabase stop` → `supabase start` to pick up new project_id
- Re-login to CLI after config dir change
