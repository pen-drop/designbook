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

When components were created earlier in this same run, the `story_url` resolver can lag behind Storybook's freshly-built index and fail to resolve the scene's story. Do **not** debug the resolver, and do **not** try to pass `story_url` in `workflow done --data`: it is a *param* (resolved at create time), not a result key, so `done` rejects it as an undeclared key.

Two working recoveries, in order:

1. **Refresh the index and re-run the stage.** The resolver lag is a stale Storybook index. Restart Storybook so the index rebuilds, then re-run the `validate` stage — the resolver now finds the freshly-indexed story:

   ```bash
   _debo storybook start --force
   ```

2. **Run the render check with the URL directly.** For the `_debo storybook check` render check itself you never need the resolved param — pass the explicit story URL as its positional argument, built from the scene's story id and the running Storybook port:

   ```
   http://localhost:<port>/iframe.html?id=<scene-story-id>&viewMode=story
   ```

The resolver ideally handles this lag itself — that is a known gap tracked separately and out of scope here.
