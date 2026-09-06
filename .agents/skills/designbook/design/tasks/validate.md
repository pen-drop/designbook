---
title: "Validate"
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

Run `_debo storybook check <story-url> [--files <changed-component-files>] [--fonts <families>]` to do the render check: it runs the staleness preflight (component files newer than the daemon → restart), goes to the story, scans for console errors, and verifies expected fonts loaded. Consume the compact `CHECK_RESULT` JSON — do not paste raw page state.

## `story_url` resolution failed after same-run component creation

Use the concrete story URL and target recorded during intake. Restart stale Storybook before validation. Completion: the declared story renders and its validation results are recorded.
