---
description: Audit project documentation against the codebase. Validates docs/, README.md, and CLAUDE.md for accuracy, staleness, broken references, and missing coverage. Use when the user says "audit docs", "check docs", or wants to verify documentation is up to date.
---

# Audit Documentation

Validate all project documentation against the actual codebase. Find inaccuracies, stale references, broken links, and gaps in coverage — then fix them after user approval.

## Step 1: Discover documentation files

Collect every documentation file to audit:

1. All files in `docs/` (recursively)
2. `README.md`
3. `CLAUDE.md`

List the files you found so the user can see what will be audited.

## Step 2: Audit each doc in parallel

Spawn one **Explore subagent per documentation file**. Each subagent receives the full contents of its assigned doc and audits it against the codebase.

Each subagent should check for:

### Factual accuracy
- Do descriptions of how things work match the actual code?
- Are architecture descriptions correct?
- Are technology/library references accurate (names, versions, usage)?
- Do described workflows match what the code actually does?

### Broken references
- Do file paths mentioned in the doc actually exist?
- Do command examples actually work (e.g., scripts referenced, CLI flags)?
- Are links to other docs or external resources valid?

### Staleness
- Does the doc describe features, files, or patterns that no longer exist?
- Are there renamed or moved files that the doc still references by old names?
- Are there deprecated APIs or removed dependencies still mentioned?

### Level of detail
- Docs should generally be high-level overviews, not low-level implementation details that go stale quickly. Flag anything that's overly granular (unless it clearly needs to be specific, e.g., migration instructions).

Additionally, spawn **one more subagent** to check for **missing documentation coverage**:
- Are there significant parts of the codebase (major features, important modules, key architectural decisions) that have no documentation at all?
- Are there directories or subsystems that a new contributor would struggle to understand without docs?

## Step 3: Present the audit report

Compile all subagent findings into a single, clear summary organized by file. Use this format:

```
## Audit Summary

### docs/overview.md
- [inaccurate] Description says X but code does Y
- [stale] References `old-file.ts` which no longer exists
- [too granular] Section on internal DB schema — consider making higher-level

### README.md
- [missing] No setup instructions
- [broken link] Link to `/docs/api.md` — file doesn't exist

### CLAUDE.md
- [accurate] All references check out
- (no issues found)

### Missing coverage
- No documentation for the grading system logic
- The deployment process is undocumented
```

Categorize each finding as: `[inaccurate]`, `[stale]`, `[broken reference]`, `[too granular]`, `[missing]`, or `[accurate]` (when a doc checks out clean).

At the end of the summary, ask the user for confirmation before making any changes.

## Step 4: Apply fixes (after user confirmation)

Only proceed once the user confirms. Then:

1. Spawn subagents in parallel — **one per file that needs updates** — to apply the fixes.
2. Each subagent should:
   - Fix inaccuracies by reading the relevant source code and rewriting the doc to match
   - Remove stale references
   - Fix or remove broken links/paths
   - Simplify overly granular sections to be higher-level
   - For missing coverage: create new doc files in `docs/` or add sections to existing docs as appropriate
3. Keep the same tone and style as the existing docs. Don't bloat them — docs should stay concise and high-level.

## Guidelines

- Be liberal with subagents. Parallelism is preferred over sequential work.
- When in doubt about whether something is inaccurate, check the code — don't guess.
- Don't flag stylistic preferences (formatting, heading levels) unless they actively harm readability.
- A doc with no issues is a valid finding — report it as clean.
