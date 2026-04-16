---
name: designbook:design:capture-storybook
title: "Capture Storybook: {scene_id} ({breakpoint}/{region})"
trigger:
  steps: [recapture]
filter:
  type: screenshot
priority: 20
params:
  type: object
  required: [scene_id, story_id, breakpoint, region]
  properties:
    scene_id: { type: string }
    story_id: { type: string }
    breakpoint: { type: string }
    region: { type: string }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [screenshot]
  properties:
    screenshot:
      path: designbook/stories/{story_id}/screenshots/{breakpoint}--{region}.png
each:
  checks:
    $ref: ../schemas.yml#/Check
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
| sm | header | `screenshots/sm--header.png` |
| sm | footer | `screenshots/sm--footer.png` |
| xl | full | `screenshots/xl--full.png` |
