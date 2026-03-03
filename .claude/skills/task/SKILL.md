---
description: Create a task (bug, chore, or feature) as a tracked markdown file in ./tasks/. Use when the user wants to log a bug, track a chore, or plan a feature — even if they just say "add a task" or describe something that needs doing without explicitly saying "task".
---

# Create Task

Create a new task file in `./tasks/`, tracking bugs, chores, and features as markdown files with frontmatter.

## Step 1: Gather info

Ask the user two things using AskUserQuestion:

1. **Type** — bug, chore, fix, or feature
2. **Description** — what needs to be done (freeform, can be a sentence or a paragraph)

If the user already provided this info (e.g., `/task fix the login redirect bug`), extract it directly instead of asking again. Use context clues to infer the type when obvious ("fix the bug" → bug, "add dark mode" → feature, "update dependencies" → chore).

## Step 2: Create the file

1. Derive a short kebab-case slug (3-5 words max) from the description. Strip filler words, keep it scannable.
   - "the login page redirects to the wrong URL after signup" → `login-redirect-after-signup`
   - "add dark mode support to the settings page" → `dark-mode-settings`
   - "update eslint to v9" → `update-eslint-v9`

2. Use today's date (from the system context or `date +%Y-%m-%d`) for the filename and `created` field.

3. Create the directory `./tasks/` if it doesn't exist.

4. Write the file to `./tasks/YYYY-MM-DD-<type>-<slug>.md` with this structure:

```markdown
---
status: open
type: <bug|chore|feature>
created: YYYY-MM-DD
---

# <Short title derived from description>

<The user's description, cleaned up slightly for readability but preserving their intent. Keep it freeform.>
```

## Step 3: Confirm

Tell the user the task was created and show the filename.

## Moving tasks to done

If the user says a task is done (or you complete work that corresponds to an open task), move the file from `./tasks/` to `./tasks/done/`, creating the `done/` directory if needed. Update the frontmatter status to `done`.
