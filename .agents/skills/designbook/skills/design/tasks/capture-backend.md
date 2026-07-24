---
name: designbook:design:capture-backend
title: "Capture Backend: {{ story_id }} ({{ screenshot.breakpoint }}/{{ screenshot.element }}--{{ screenshot.state }})"
trigger:
  steps: [capture-backend, re-capture-backend]
params:
  type: object
  required: [screenshot, story_id, render_url]
  properties:
    screenshot:
      $ref: ../schemas.yml#/Screenshot
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
    render_url:
      type: string
      description: "Backend render URL for the candidate side (resolved in workflow scope by the render_url resolver)."
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

# Capture Backend

Captures one backend-render screenshot — the candidate side — at the given breakpoint and
element/state combination via Playwright. The frozen Storybook baseline is captured
separately by the reference stage; this task writes the candidate screenshots the compare
stage diffs against that baseline.

## Execution

1. **Navigate to the backend render**: `render_url` is the URL at which the backend renders
   the configured output.

2. **When `screenshot.state` is not `rest`**, run `screenshot.state`'s steps against the
   backend DOM BEFORE isolating, so the render is in the target interaction state.

3. **Capture** using the `playwright-capture` rule in isolate-and-capture mode: the selector
   is `screenshot.selector` (the backend-side selector that isolates the subject; use
   `#storybook-root` only for a story, never here). Viewport width comes from `design_tokens`
   at `screenshot.breakpoint`.
