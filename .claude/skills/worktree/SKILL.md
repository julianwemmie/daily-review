---
name: worktree
description: Create and set up git worktrees that are ready to run the dev server. Use this skill whenever the user wants to create a worktree, set up a parallel working directory, work on multiple branches simultaneously, or mentions "worktree" in any context. Also trigger when the user wants to parallelize their work across branches.
---

# Worktree Setup

Create a git worktree with all necessary untracked files (`.env`, `.env.local`, `.env.prod`) symlinked from the main repo, plus dependencies installed, so the worktree is immediately ready to run the dev server.

## Usage

The user provides a branch name. Run the setup script:

```bash
bash "<repo-root>/.claude/skills/worktree/setup-worktree.sh" <branch-name>
```

Where `<repo-root>` is the root of the current git repository (find it with `git rev-parse --show-toplevel`).

## What the script does

1. Creates a new git worktree at `../<repo-dirname>-<branch-name>` relative to the repo root
   - If the branch already exists, it checks it out; otherwise it creates a new branch from the current HEAD
2. Symlinks `.env`, `.env.local`, and `.env.prod` from the main repo (only the ones that exist)
3. Runs `bun install` in the new worktree
4. Prints a summary with the path to `cd` into

## Behavior notes

- If the user doesn't specify a branch name, ask for one before running the script.
- If the script fails, read its output and help the user troubleshoot. Common issues:
  - Branch already checked out in another worktree → suggest a different branch name or remove the old worktree first
  - The worktree directory already exists → ask if they want to remove it and start fresh
- After the script completes, tell the user the full path they can `cd` into and remind them they can run `bun run dev` there.
