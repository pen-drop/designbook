---
name: designbook:design:capture-storybook
title: "Capture Storybook: {scene_id} ({breakpoint}/{region})"
trigger:
  steps: [capture]
filter:
  type: screenshot
priority: 20
params:
  type: object
  required: [scene_id, story_id, breakpoint, region]
  properties:
    scene_id:
      $ref: ../../scenes/schemas.yml#/SceneId
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
    story_url:
      type: string
      resolve: story_url
      from: story_id
    breakpoint:
      $ref: ../schemas.yml#/BreakpointId
    region:
      $ref: ../schemas.yml#/RegionId
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

1. **Use the Storybook URL from the resolved param**: the `story_url` param is pre-resolved to the iframe URL (`http://localhost:<port>/iframe.html?id=<storyId>&viewMode=story`).

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
