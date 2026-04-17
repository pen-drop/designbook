---
name: designbook:design:compare-screenshots
title: "Compare Screenshots: {scene_id} ({breakpoint}/{region})"
trigger:
  steps: [compare]
params:
  type: object
  $ref: ../schemas.yml#/Check
  required: [scene_id, story_id, reference_folder]
  properties:
    scene_id:
      $ref: ../../scenes/schemas.yml#/SceneId
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
    story_meta:
      path: designbook/stories/{story_id}/meta.yml
      type: object
      $ref: ../schemas.yml#/StoryMeta
    story_url:
      type: string
      resolve: story_url
      from: story_id
    reference_folder:
      $ref: ../schemas.yml#/ReferenceFolder
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
each:
  checks:
    $ref: ../schemas.yml#/Check
result:
  type: object
  required: [issues]
  properties:
    issues:
      type: array
      items:
        $ref: ../schemas.yml#/Issue
---

# Compare Screenshots

Captures the Storybook screenshot, compares it with the reference, and writes draft issues for triage.

## Phase 1: Capture Storybook Screenshot

1. **Use the Storybook URL from the resolved param**: the `story_url` param is pre-resolved to the iframe URL (`http://localhost:<port>/iframe.html?id=<storyId>&viewMode=story`).

2. **Capture screenshot** using the `playwright-capture` rule:
   - Resolve viewport width from `design-tokens.yml`
   - Use selector from the check's `selector` field
   - Full-page CLI for `full` region, element Node API for named regions (header, footer)
   - Save to `designbook/stories/{story_id}/screenshots/{breakpoint}--{region}.png`

3. **Verify** by reading the captured image.

## Phase 2: Compare

1. **Read both images:**
   - Reference: `{reference_folder}/{breakpoint}--{region}.png`
   - Storybook: `designbook/stories/{story_id}/screenshots/{breakpoint}--{region}.png`

   If either image is missing, skip with a warning.

2. **Collect context:**
   - Design tokens from `design-tokens.yml`
   - Per-region threshold from `story_meta.reference.breakpoints.<bp>.regions.<region>.threshold`

3. **Compare visually** using multimodal capabilities. Evaluate layout, colors, typography, spacing. Focus on the specific element for named regions.

   Severity: **Critical** (structure wrong), **Major** (colors/fonts off), **Minor** (spacing/opacity).

## Phase 3: Emit Issues

Emit the found issues as a task result — they are **not** written to disk. Triage will consolidate and publish them.

**Issue descriptions must be actionable:**
- WHAT deviates (concrete element + property)
- Expected vs. actual value (where discernible)
- WHICH file is affected (`file_hint`)
- Brief reasoning why it is an issue

Complete the task with `workflow done --data` passing the issues array. The engine collects issues from all check iterations into the workflow scope for later stages (e.g. verify, triage).

```bash
workflow done --data '{"issues": [{ "scene_id": "...", "severity": "major", ... }]}'
```

If no issues found, emit an empty array: `workflow done --data '{"issues": []}'`.

> **Note**: This is an AI-based visual comparison using multimodal capabilities, not a pixel-level diff.
