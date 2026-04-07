---
name: designbook:design:playwright-session
when:
  steps: [capture, compare]
---

# Playwright Session Management

Hard constraints for playwright-cli session lifecycle during inspect steps.

## Session Naming

- Sessions MUST use the naming convention `-s=inspect`
- All tasks within the `inspect` step share the same session

## Lifecycle

1. The **first** task in the inspect step opens the session:
   ```bash
   npx playwright-cli -s=inspect open <url>
   ```

2. Subsequent tasks reuse the session — do NOT call `open` again

3. The **last** task in the inspect step closes the session:
   ```bash
   npx playwright-cli -s=inspect close
   ```

## Error Handling

- If a task fails, the session MUST still be closed
- Use a try/finally pattern: attempt close even after errors
- If `close` fails (session already gone), ignore the error

## Constraints

- Do NOT open multiple sessions simultaneously in the same step
- Do NOT leave sessions open after the inspect step completes
- Session timeout: if no command is sent for 60 seconds, the session may expire
