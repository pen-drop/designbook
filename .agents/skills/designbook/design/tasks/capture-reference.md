---
name: designbook:design:capture-reference
when:
  steps: [capture]
priority: 10
each: reference.breakpoints
params:
  scene: ~
files:
  - key: screenshot
    path: designbook/stories/{storyId}/screenshots/reference/{breakpoint}.png
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
| `outputPath` | computed | `designbook/stories/{storyId}/screenshots/reference/{breakpoint}.png` |

## Execution

1. **Resolve storyId and read meta.yml**
   ```bash
   _debo story --scene ${scene}
   ```
   Read `designbook/stories/{storyId}/meta.yml` → `reference.source.url` and `reference.breakpoints`.

2. **For each breakpoint** (from `each: reference.breakpoints`):

   a. **Check skip condition**: If `outputPath` already exists, check if `source.url` has changed since last capture. If unchanged, skip:
   > "Reference for {breakpoint} unchanged — skipping."

   b. **Resolve viewport width** from `design-tokens.yml` breakpoint definitions.

   c. **Capture screenshot**:
   ```bash
   mkdir -p "designbook/stories/${storyId}/screenshots/reference"
   npx playwright screenshot --full-page --viewport-size "${viewportWidth},1600" --wait-for-timeout 3000 "${url}" "${outputPath}"
   ```

   d. **Verify** by reading the captured image.

## Output

Report which reference screenshots were captured:

| Breakpoint | Path | Status |
|-----------|------|--------|
| sm | `designbook/stories/{storyId}/screenshots/reference/sm.png` | captured |
| xl | `designbook/stories/{storyId}/screenshots/reference/xl.png` | skipped (unchanged) |
