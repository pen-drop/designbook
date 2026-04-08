---
name: designbook:design:playwright-capture
when:
  steps: [capture, recapture, compare, verify]
---

# Playwright Capture

Hard constraints for capturing screenshots via Playwright.

## Capture Modes

### Full-page capture (region `full` or empty selector)

Use the Playwright CLI:

```bash
npx playwright screenshot --full-page \
  --viewport-size "${viewportWidth},1600" \
  --wait-for-timeout 3000 \
  "${url}" "${outputPath}"
```

### Element capture (region with CSS selector)

The Playwright CLI does **not** support element-level screenshots. Use the Node API:

```javascript
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: viewportWidth, height: 1600 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.locator(selector).first().screenshot({ path: outputPath });
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
