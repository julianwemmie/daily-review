# Authentication

Amber uses [better-auth](https://www.better-auth.com/) for all authentication. There are three ways to authenticate: web sessions, API keys, and device authorization (for CLI login).

## Web Authentication

Standard browser-based auth with two options:

- **Email/password** — sign up and sign in with credentials
- **GitHub OAuth** — social login via GitHub

Account linking is enabled, so a user who signs up with email can later link their GitHub account (and vice versa).

The auth client is configured in `src/client/lib/auth-client.ts` and talks to the `/auth` base path on the server.

## API Keys

API keys let the CLI and other integrations authenticate without a browser session.

- **Generated in the web app** via the API Key Manager dialog (user menu). Users name their key, copy it once, and can revoke it later.
- **Stored by the CLI** in `~/.amber-cards/config.json` (field: `apiKey`).
- **Sent as a header**: `x-api-key: <key>` on every API request.
- Can also be set via the `AMBER_CARDS_API_KEY` environment variable.

The better-auth `apiKey` plugin handles creation, listing, verification, and deletion server-side.

## Device Authorization Flow (CLI Login)

The default `amber-cards login` command uses the OAuth 2.0 Device Authorization Grant so the CLI can obtain a session token through the browser:

1. CLI requests a device code from `POST /auth/device/code`.
2. Server returns a `device_code`, `user_code`, and `verification_uri`.
3. CLI opens the browser to the verification URL (with the user code pre-filled).
4. User approves the request in the browser (must be logged in).
5. CLI polls `POST /auth/device/token` until the user approves, denies, or the code expires (5-minute timeout).
6. On approval, the server returns an `access_token`. The CLI saves it to `~/.amber-cards/config.json` (field: `sessionToken`).

The token is sent as `Authorization: Bearer <token>` on subsequent requests. The better-auth `bearer` plugin resolves these to sessions server-side.

## Auth Middleware

All API routes go through `requireAuth` (`src/server/middleware/auth.ts`), which tries two strategies in order:

1. **Session** — calls `auth.api.getSession()` with the request headers. This covers both cookie-based web sessions and `Bearer` tokens (via the bearer plugin).
2. **API key** — if no session, checks for an `x-api-key` header and verifies it via `auth.api.verifyApiKey()`.

If neither succeeds, the request gets a `401 Unauthorized`.

## CLI Auth Resolution

The CLI (`src/cli/config.ts`) resolves credentials in priority order:

1. `--api-key` flag passed to the command
2. `AMBER_CARDS_API_KEY` environment variable
3. Saved session token (from device flow) in `~/.amber-cards/config.json`
4. Saved API key in `~/.amber-cards/config.json`

If none are found, the CLI prints login instructions and exits.

## Related docs

- [Project overview](overview.md)
- [API routes](api.md)
- [CLI usage](cli.md)
- [Database schema](schema.md)
