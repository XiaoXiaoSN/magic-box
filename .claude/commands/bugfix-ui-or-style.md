---
name: bugfix-ui-or-style
description: Workflow command scaffold for bugfix-ui-or-style in magic-box.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /bugfix-ui-or-style

Use this workflow when working on **bugfix-ui-or-style** in `magic-box`.

## Goal

Fixes a bug or layout issue by making targeted changes to UI components and/or global styles, sometimes involving a single page or component.

## Common Files

- `src/components/**/*.tsx`
- `src/pages/**/*.tsx`
- `src/global/styles.css`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Identify the UI component or page with the issue
- Edit the relevant .tsx file(s) in src/components/ or src/pages/
- Update src/global/styles.css if the fix involves CSS
- Test the fix locally

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.