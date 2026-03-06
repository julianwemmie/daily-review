---
status: open
type: chore
created: 2026-03-06
---

# Set up CI/CD

Add GitHub Actions workflows for the project. Required before npm publish.

## 1. CI workflow (`.github/workflows/ci.yml`)

Runs on every PR and push to main.

- Install deps (`bun install`)
- Build (`bun run build`)
- Test (`bun run test`)

## 2. npm publish workflow (`.github/workflows/publish.yml`)

Runs on GitHub release (or version tag like `v*`).

- Build + test (same as CI)
- `npm publish`
- Requires `NPM_TOKEN` GitHub Actions secret
