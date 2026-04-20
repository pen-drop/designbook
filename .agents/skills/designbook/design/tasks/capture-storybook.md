---
name: designbook:design:capture-storybook
title: "Capture Storybook: {{ check.scene_id }} ({{ check.breakpoint }}/{{ check.region }})"
trigger:
  steps: [capture]
filter:
  check.type: screenshot
priority: 20
params:
  type: object
  required: [check]
  properties:
    check:
      type: object
      $ref: ../schemas.yml#/Check
    story_url:
      type: string
      resolve: story_url
      from: check.story_id
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [screenshot]
  properties:
    screenshot:
      path: "designbook/stories/{{ check.story_id }}/screenshots/{{ check.breakpoint }}--{{ check.region }}.png"
each:
  check:
    expr: "checks"
    schema: { $ref: ../schemas.yml#/Check }
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
