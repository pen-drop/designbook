---
name: designbook:design:playwright-capture
when:
  steps: [capture, recapture, compare, polish]
---

# Playwright Capture

Hard constraints for capturing screenshots via Playwright. All browser interaction uses `playwright-cli` — see [cli-playwright.md](../../resources/cli-playwright.md) for the full command reference.

## Staged File Flow

Screenshots MUST go through the workflow staging pipeline. Before capturing:

1. **Get the staged path** from the workflow:
   ```bash
   STAGED=$(_debo workflow get-file $WORKFLOW_NAME $TASK_ID --key screenshot | jq -r '.staged_path')
   mkdir -p "$(dirname "$STAGED")"
   ```

2. **Capture to the staged path** (see Capture Modes below).

3. **Register the file** so it gets validation_result and proper tracking:
   ```bash
   _debo workflow write-file $WORKFLOW_NAME $TASK_ID --key screenshot --external
   ```

## Capture Modes

### Full-page capture (region `full` or empty selector)

```bash
npx playwright-cli open
npx playwright-cli goto "${url}"
npx playwright-cli resize ${viewportWidth} 1600
npx playwright-cli run-code "async (page) => { await page.waitForTimeout(3000) }"
npx playwright-cli screenshot --full-page --filename "${STAGED}"
npx playwright-cli close
```

### Element capture (region with CSS selector)

Use `snapshot` to get element refs, then `screenshot` with the ref:

```bash
npx playwright-cli open
npx playwright-cli goto "${url}"
npx playwright-cli resize ${viewportWidth} 1600
npx playwright-cli run-code "async (page) => { await page.waitForTimeout(3000) }"
npx playwright-cli snapshot
# Find the ref for the target element (e.g. header, footer)
npx playwright-cli screenshot <ref> --filename "${STAGED}"
npx playwright-cli close
```

If the element is best identified by CSS selector, use `eval` to confirm it exists, then `snapshot` to get its ref.

## Constraints

- Viewport height MUST be 1600px for consistency across captures
- `run-code "(page) => { await page.waitForTimeout(3000) }"` MUST be used to allow rendering to settle
- If a selector matches no elements, skip with a warning — do NOT fail the task
- Output directories MUST be created before capture (`mkdir -p`)
- Reuse an open session across multiple captures for the same URL — only `open`/`close` once

## Storybook Restart

After modifying component templates, scene definitions, or CSS during a polish step, Storybook MUST be restarted before recapture:

```bash
_debo storybook start --force
```
