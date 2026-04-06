---
name: designbook:design:storybook-preview
when:
  steps: [storybook-preview]
priority: 5
params: {}
files: []
---

# Storybook Preview

Ensures Storybook is running so the user can visually review the workflow output.

## Execution

1. Check if Storybook is already running:
   ```bash
   _debo storybook status
   ```

2. **If running** (`{ running: true, port: ... }`): check freshness — compare the `started_at` timestamp from status against the modification time of the components directory. If any component files are newer than Storybook's start time, restart:
   ```bash
   _debo storybook stop && _debo storybook start
   ```
   Otherwise, use the existing instance.

3. **If not running** (`{ running: false }`): start Storybook:
   ```bash
   _debo storybook start
   ```
   Wait for the JSON output with `{ ready: true, port: ... }`.

4. **If startup fails** (build errors in output): report the errors from `_debo storybook logs` and pause for user intervention.

## After

Show the user the preview URL (`http://localhost:${port}`) and confirm Storybook is ready before proceeding to the next task.
