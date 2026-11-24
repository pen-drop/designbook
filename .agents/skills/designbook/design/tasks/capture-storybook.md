---
name: designbook:design:capture-storybook
title: >-
  Capture Storybook: {{ story_id }} ({{ screenshot.breakpoint }}/{{ screenshot.element }}--{{ screenshot.state
  }})
trigger:
  steps:
    - capture
    - re-capture
params:
  type: object
  required:
    - screenshot
    - story_id
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
  required:
    - screenshot_file
  properties:
    screenshot_file:
      path: >-
        $DESIGNBOOK_DATA/stories/{{ story_id }}/screenshots/{{ screenshot.breakpoint }}--{{ screenshot.element
        }}--{{ screenshot.state }}.png
      submission: direct
      validators:
        - image
---

# Capture Storybook

One Storybook PNG at `screenshot.breakpoint` / `screenshot.element` /
`screenshot.state` from the resolved `story_url` iframe, at the token width
for that breakpoint.
