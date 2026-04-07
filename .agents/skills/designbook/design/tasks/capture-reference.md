---
name: designbook:design:capture-reference
title: "Capture Reference: {scene} ({breakpoint}/{region})"
when:
  steps: [capture]
priority: 10
params:
  scene: ~
  storyId: ~
  breakpoint: ~
  region: ~
files:
  - key: screenshot
    path: designbook/stories/{storyId}/screenshots/reference/{breakpoint}--{region}.png
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Capture Reference

Captures reference screenshots by loading the source URL at each breakpoint viewport width via Playwright.

## Params (per iteration)

| Param | Source | Description |
|---|---|---|
| `url` | `meta.yml` → `reference.source.url` | URL to screenshot |
| `viewportWidth` | design-tokens.yml breakpoint | Pixel width for this breakpoint |
| `outputPath` | computed | `designbook/stories/{storyId}/screenshots/reference/{breakpoint}--{region}.png` |

## Execution

1. **Resolve storyId and read meta.yml**
   ```bash
   _debo story --scene ${scene}
   ```
   Read `designbook/stories/{storyId}/meta.yml` → `reference.source.url` and `reference.breakpoints`.

   If `source.url` is a download URL (triggers file download instead of rendering), download it to a local temp file first, then use `file:///tmp/reference-${storyId}.html` as the capture URL.

2. **Capture screenshot** for this breakpoint/region combination (from params):

   a. **Check skip condition**: If output file already exists and `source.url` has not changed, skip.

   b. **Resolve viewport width** from `design-tokens.yml` and **selector** from `meta.yml` regions.

   c. **Capture** using the method from the `playwright-capture` rule (full-page CLI or element Node API depending on region type).

   d. **Verify** by reading the captured image.

## Output

| Breakpoint | Region | Path |
|-----------|--------|------|
| sm | header | `screenshots/reference/sm--header.png` |
| sm | footer | `screenshots/reference/sm--footer.png` |
| xl | full | `screenshots/reference/xl--full.png` |
