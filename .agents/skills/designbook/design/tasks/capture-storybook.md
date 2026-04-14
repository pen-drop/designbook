---
name: designbook:design:capture-storybook
title: "Capture Storybook: {scene} ({breakpoint}/{region})"
when:
  steps: [recapture]
  type: screenshot
priority: 20
params:
  scene: { type: string }
  storyId: { type: string }
  breakpoint: { type: string }
  region: { type: string }
result:
  screenshot:
    path: designbook/stories/{storyId}/screenshots/current/{breakpoint}--{region}.png
each:
  checks:
    $ref: ../schemas.yml#/Check
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Capture Storybook

Captures a Storybook screenshot at the given breakpoint viewport width via Playwright.

## Execution

1. **Resolve Storybook URL** from `DeboStory` entity:
   ```bash
   _debo story --scene ${scene}
   ```
   Extract the Storybook iframe URL from the story JSON output.

2. **Capture screenshot** using the `playwright-capture` rule (staged file flow):

   a. **Resolve viewport width** from `design-tokens.yml` and **selector** from the check's `selector` field.

   b. **Capture** using the method from the `playwright-capture` rule (full-page CLI or element Node API depending on region type).

   c. **Verify** by reading the captured image.

## Output

| Breakpoint | Region | Path |
|-----------|--------|------|
| sm | header | `screenshots/current/sm--header.png` |
| sm | footer | `screenshots/current/sm--footer.png` |
| xl | full | `screenshots/current/xl--full.png` |
