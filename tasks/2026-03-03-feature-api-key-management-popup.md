---
status: open
type: feature
created: 2026-03-03
---

# API key management popup

Replace the existing "Generate API key" dialog in `UserMenu.tsx` with a unified API key management popup that handles creating, viewing, and revoking keys.

## What exists today

- `apikey` database table (via Better Auth plugin) with `name`, `prefix`, `createdAt`, `enabled`, etc.
- `authClient.apiKey.create()` on the client
- Simple generate-and-copy dialog in `UserMenu.tsx`
- Server-side validation middleware in `src/server/middleware/auth.ts`

## Requirements

### Viewing keys
- List all user's API keys showing **name** and **created date**
- No limit on number of keys

### Creating keys
- **Name field** required when creating (e.g. "Claude Code", "CI Pipeline")
- After creation, show the full key once with a copy button and "you won't see this again" warning
- Same flow as today, but with the name field added

### Revoking keys
- Each key row has a revoke/delete action
- **Confirmation dialog** before revoking ("Are you sure?")
- Revoked keys disappear from the list

### UX
- Single popup replaces the current "Generate API key" dialog
- Accessible from the existing profile dropdown menu item
