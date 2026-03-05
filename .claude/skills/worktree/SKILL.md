---
name: worktree
description: Create and set up git worktrees that are ready to run the dev server. Use this skill whenever the user wants to create a worktree, set up a parallel working directory, work on multiple branches simultaneously, or mentions "worktree" in any context. Also trigger when the user wants to parallelize their work across branches. Also trigger when the user says they're done with a worktree, want to finish/complete a worktree, merge a worktree, or clean up a worktree.
---

# Worktree Skill

This skill has two modes: **create** and **finish**.

## Mode: Create

Create a git worktree with all necessary untracked files (`.env`, `.env.local`, `.env.prod`) symlinked from the main repo, plus dependencies installed, so the worktree is immediately ready to run the dev server.

### Usage

The user provides a branch name. Run the setup script:

```bash
bash "<repo-root>/.claude/skills/worktree/setup-worktree.sh" <branch-name>
```

Where `<repo-root>` is the root of the current git repository (find it with `git rev-parse --show-toplevel`).

### What the script does

1. Creates a new git worktree at `../<repo-dirname>-<branch-name>` relative to the repo root
   - If the branch already exists, it checks it out; otherwise it creates a new branch from the current HEAD
2. Symlinks `.env`, `.env.local`, and `.env.prod` from the main repo (only the ones that exist)
3. Runs `bun install` in the new worktree
4. Prints a summary with the path to `cd` into

### Behavior notes

- If the user doesn't specify a branch name, ask for one before running the script.
- If the script fails, read its output and help the user troubleshoot. Common issues:
  - Branch already checked out in another worktree → suggest a different branch name or remove the old worktree first
  - The worktree directory already exists → ask if they want to remove it and start fresh
- After the script completes, tell the user the full path they can `cd` into and remind them they can run `bun run dev` there.

---

## Mode: Finish

Complete work on a worktree: commit, create a PR, and after user approval, merge and clean up.

### Prerequisites

- `gh` CLI must be installed. If it's not available, tell the user to install it (`brew install gh`).
- This command MUST be run from the main repo, NOT from inside the worktree. If the current working directory is inside a worktree (check with `git rev-parse --show-toplevel` — if it doesn't match the main repo root, or check `git worktree list` and compare), tell the user to `cd` back to the main repo first and stop. This is critical because removing a worktree while inside it will break the process.

### Step 1: Identify the worktree

If the user specifies a branch name, use that. Otherwise, run `git worktree list` and show them the available worktrees to pick from.

Determine the worktree path and branch name from `git worktree list`.

### Step 2: Commit and push

In the worktree directory, auto-commit all changes:

```bash
cd <worktree-path>
git add -A
git status
```

If there are changes to commit:
```bash
git commit -m "<descriptive message based on the changes>"
```

Then push:
```bash
git push -u origin <branch-name>
```

### Step 3: Move associated task to done (if applicable)

Look in `./tasks/` (in the main repo) for any open task file whose slug matches or closely relates to the branch name. If the user specified or heavily implied a task, or if there's an obvious match, move it to done using the `/task` skill pattern:
- Move the file from `./tasks/` to `./tasks/done/`
- Update the frontmatter status to `done`

If no matching task is found, skip this step silently.

### Step 4: Create a PR

```bash
gh pr create --base main --head <branch-name> --title "<title>" --body "<body>"
```

Use a clear title derived from the branch name/commits. Include a brief body summarizing the changes.

Give the user the PR link.

### Step 5: STOP and wait for permission

**Do NOT proceed past this point without explicit user approval.** Tell the user the PR is ready and ask if they want to merge. Only continue if they say yes or give clear permission.

### Step 6: Check mergeability and resolve conflicts

Before merging, check if the PR can be merged cleanly:

```bash
gh pr view <branch-name> --json mergeStateStatus
```

If there are merge conflicts:
1. In the worktree, rebase onto main:
   ```bash
   cd <worktree-path>
   git fetch origin main
   git rebase origin/main
   ```
2. If the conflicts are minor (e.g., lockfile, small overlapping edits), resolve them yourself, then `git add` and `git rebase --continue`, then force-push.
3. If the conflicts are major (large structural changes, many files affected), stop and tell the user what the conflicts are so they can decide how to proceed.

### Step 7: Merge and clean up

```bash
gh pr merge <branch-name> --squash --delete-branch
```

Then clean up locally:

```bash
git worktree remove <worktree-path>
git branch -D <branch-name>
git pull
```

Tell the user the merge is complete and they're on an up-to-date main.
