---
name: designbook:design:capture-storybook
title: "Capture Storybook: {scene} ({breakpoint}/{region})"
when:
  steps: [capture, recapture]
priority: 20
params:
  scene: ~
  storyId: ~
  breakpoint: ~
  region: ~
files:
  - key: screenshot
    path: designbook/stories/{storyId}/screenshots/current/{breakpoint}--{region}.png
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Capture Storybook

Captures Storybook screenshots at each breakpoint viewport width via Playwright. Uses the `DeboStoryCheck` test item for all parameters.

## Params (from DeboStoryCheck test item)

| Param | Source | Description |
|---|---|---|
| `scene` | test item | Scene reference in `group:sceneName` format |
| `storyId` | test item | Story identifier |
| `breakpoint` | test item | Breakpoint name |
| `region` | test item | Region name |

## Execution

1. **Resolve Storybook URL** from `DeboStory` entity:
   ```bash
   _debo story --scene ${scene}
   ```
   Extract the Storybook iframe URL from the story JSON output.

2. **Capture screenshot** for this breakpoint/region combination:

   a. **Resolve viewport width** from `design-tokens.yml` and **selector** from the check's `selector` field.

   b. **Capture** using the method from the `playwright-capture` rule (full-page CLI or element Node API depending on region type).

   c. **Verify** by reading the captured image.

## Output

| Breakpoint | Region | Path |
|-----------|--------|------|
| sm | header | `screenshots/current/sm--header.png` |
| sm | footer | `screenshots/current/sm--footer.png` |
| xl | full | `screenshots/current/xl--full.png` |
