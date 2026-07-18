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

When components were created earlier in this same run, the `story_url` resolver can lag behind Storybook's freshly-built index and fail to resolve the scene's story. Do **not** debug the resolver. Pass the URL explicitly instead, constructing it from the scene's story id and the running Storybook port:

```
http://localhost:<port>/iframe.html?id=<scene-story-id>&viewMode=story
```

Supply it via the stage result / `--data` (or as the `story-url` argument to `_debo storybook check`). The resolver ideally handles this lag itself — that is a known gap tracked separately and out of scope here.
