---
name: designbook:design:capture-reference
title: "Capture Reference: {scene} ({breakpoint}/{region})"
when:
  steps: [capture]
  type: screenshot
priority: 10
params:
  scene: ~
  storyId: ~
  breakpoint: ~
  region: ~
files:
  - key: screenshot
    path: $DESIGNBOOK_DATA/stories/{storyId}/screenshots/reference/{breakpoint}--{region}.png
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Capture Reference

Captures a reference screenshot by loading the source URL at the given breakpoint viewport width via Playwright.

## Execution

1. **Resolve reference URL** from `DeboStory` entity:
   ```bash
   _debo story --scene ${scene}
   ```
   Read the `reference.url` from the story JSON output. If no reference URL is available, skip with a warning.

   **Download URLs:** If the reference URL triggers a file download instead of rendering in the browser (e.g., a provider-specific download endpoint), download it first:
   ```bash
   curl -sL "$URL" -o /tmp/reference-${storyId}.html
   ```
   Then use `file:///tmp/reference-${storyId}.html` as the capture URL.

2. **Capture screenshot** for this breakpoint/region combination using the `playwright-capture` rule (staged file flow):

   a. **Check skip condition**: If output file already exists and reference URL has not changed, skip.

   b. **Resolve viewport width** from `design-tokens.yml`.

   c. **Select capture mode by region:**

   | Region | Mode | Method |
   |--------|------|--------|
   | `full` (or no selector) | Full-page | `npx playwright screenshot --full-page` (CLI) |
   | `header` | Element | Node API: `page.locator('header').first().screenshot()` |
   | `footer` | Element | Node API: `page.locator('footer').first().screenshot()` |
   | Other named region | Element | Node API: use selector from check's `selector` field |

   For element captures the reference HTML page must contain a matching HTML element. If the selector matches nothing, skip with a warning.

   d. **Verify** by reading the captured image.

## Output

| Breakpoint | Region | Path |
|-----------|--------|------|
| sm | header | `screenshots/reference/sm--header.png` |
| sm | footer | `screenshots/reference/sm--footer.png` |
| xl | full | `screenshots/reference/xl--full.png` |
