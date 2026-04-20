---
trigger:
  steps: [validate]
params:
  type: object
  required: [story_url]
  properties:
    story_url:
      type: string
      resolve: story_url
      from: scene_id
---

# Validate Story

Confirm that the story at `story_url` renders in Storybook without errors.
