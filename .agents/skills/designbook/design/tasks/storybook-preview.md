---
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

2. **If running** (`{ running: true, port: ... }`): skip starting, use the existing instance.

3. **If not running** (`{ running: false }`): start Storybook:
   ```bash
   _debo storybook start
   ```
   Wait for the JSON output with `{ ready: true, port: ... }`.

4. **If startup fails** (build errors in output): report the errors from `_debo storybook logs` and pause for user intervention.

## After

Show the user the preview URL (`http://localhost:${port}`) and confirm Storybook is ready before proceeding to the next task.
