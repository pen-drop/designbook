---
name: designbook:design:capture-storybook
when:
  steps: [capture]
priority: 20
each: reference.breakpoints
params:
  scene: ~
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Capture Storybook

Captures Storybook screenshots at each breakpoint viewport width via Playwright.

## Params (per iteration)

| Param | Source | Description |
|---|---|---|
| `storybookUrl` | `_debo story` | Storybook iframe URL for this story |
| `viewportWidth` | design-tokens.yml breakpoint | Pixel width for this breakpoint |
| `outputPath` | computed | `designbook/stories/{storyId}/screenshots/current/{breakpoint}.png` |

## Execution

1. **Resolve storyId and Storybook URL**
   ```bash
   _debo story --scene ${scene}
   ```
   Extract `storyId` and `url` (iframe URL).

2. **Read meta.yml** to get the list of breakpoints:
   ```
   designbook/stories/${storyId}/meta.yml → reference.breakpoints
   ```

   If no meta.yml exists, skip:
   > "No meta.yml for this scene — skipping capture."

3. **For each breakpoint** (from `each: reference.breakpoints`):

   a. **Resolve viewport width** from `design-tokens.yml`.

   b. **Capture screenshot**:
   ```bash
   mkdir -p "designbook/stories/${storyId}/screenshots/current"
   npx playwright screenshot --full-page --viewport-size "${viewportWidth},1600" --wait-for-timeout 3000 "${storybookUrl}" "${outputPath}"
   ```

   c. **Verify** by reading the captured image.

## Output

Report which Storybook screenshots were captured:

| Breakpoint | Path |
|-----------|------|
| sm | `designbook/stories/{storyId}/screenshots/current/sm.png` |
| xl | `designbook/stories/{storyId}/screenshots/current/xl.png` |
