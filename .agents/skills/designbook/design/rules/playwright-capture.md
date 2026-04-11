---
name: designbook:design:playwright-capture
when:
  steps: [capture, recapture, compare, polish]
---

# Playwright Capture

Hard constraints for capturing screenshots via Playwright.

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

Use the Playwright CLI:

```bash
npx playwright screenshot --full-page \
  --viewport-size "${viewportWidth},1600" \
  --wait-for-timeout 3000 \
  "${url}" "${STAGED}"
```

### Element capture (region with CSS selector)

The Playwright CLI does **not** support element-level screenshots. Use the Node API:

```javascript
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: viewportWidth, height: 1600 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.locator(selector).first().screenshot({ path: STAGED });
await page.close();
await browser.close();
```

## Constraints

- Viewport height MUST be 1600px for consistency across captures
- `--wait-for-timeout 3000` (or `page.waitForTimeout(3000)`) MUST be used to allow rendering to settle
- For element captures, always use `.first()` on the locator to avoid ambiguous matches
- If a selector matches no elements, skip with a warning — do NOT fail the task
- Output directories MUST be created before capture (`mkdir -p`)

## Storybook Restart

After modifying component templates, scene definitions, or CSS during a polish step, Storybook MUST be restarted before recapture:

```bash
_debo storybook start --force
```
