---
name: feature-development-ui-component-update
description: Workflow command scaffold for feature-development-ui-component-update in magic-box.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-development-ui-component-update

Use this workflow when working on **feature-development-ui-component-update** in `magic-box`.

## Goal

Implements or updates a feature by modifying or adding React components, updating corresponding styles, and adjusting related context or module files. Often includes updates to test files and sometimes documentation or UI assets.

## Common Files

- `src/components/**/*.tsx`
- `src/components/**/*.test.tsx`
- `src/components/**/*.cy.tsx`
- `src/global/styles.css`
- `src/contexts/**/*.tsx`
- `src/modules/**/*.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Modify or add files in src/components/ (e.g., new or updated component .tsx files)
- Update or add corresponding test files (e.g., .test.tsx or .cy.tsx)
- Update or add styles in src/global/styles.css or component-specific styles
- Update related context or module files in src/contexts/ or src/modules/
- Optionally update UI assets in public/ (e.g., icons, images)

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.