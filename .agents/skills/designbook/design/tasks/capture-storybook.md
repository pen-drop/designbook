---
name: designbook:design:capture-storybook
title: "Capture Storybook: {{ story_id }} ({{ screenshot.breakpoint }}/{{ screenshot.element }}--{{ screenshot.state }})"
trigger:
  steps: [capture, re-capture]
params:
  type: object
  required: [screenshot, story_id]
  properties:
    screenshot:
      $ref: ../schemas.yml#/Screenshot
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
    story_url:
      type: string
      resolve: story_url
      from: story_id
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [screenshot_file]
  properties:
    screenshot_file:
      path: "designbook/stories/{{ story_id }}/screenshots/{{ screenshot.breakpoint }}--{{ screenshot.element }}--{{ screenshot.state }}.png"
      submission: direct
      validators: [image]
each:
  screenshot:
    expr: "story_screenshots"
    schema: { $ref: ../schemas.yml#/Screenshot }
---

# Capture Storybook

Captures one story screenshot at the given breakpoint and element/state combination via Playwright.

## Execution

1. **Use the Storybook URL from the resolved param**: `story_url` is pre-resolved to the iframe URL for `story_id`.

2. **When `screenshot.state` is not `rest`**, run `screenshot.state`'s steps against the iframe BEFORE isolating, so the story is in the target interaction state.

3. **Capture** using the `playwright-capture` rule in isolate-and-capture mode: the selector is `screenshot.selector` (use `#storybook-root` when empty). Viewport width comes from `design_tokens` at `screenshot.breakpoint`.
