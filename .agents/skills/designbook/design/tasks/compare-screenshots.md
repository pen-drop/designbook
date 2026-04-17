---
name: designbook:design:compare-screenshots
title: "Compare Screenshots: {scene_id} ({breakpoint}/{region})"
trigger:
  steps: [compare]
params:
  type: object
  $ref: ../schemas.yml#/Check
  required: [scene_id, reference_folder]
  properties:
    scene_id:
      $ref: ../../scenes/schemas.yml#/SceneId
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
  properties:
    issues:
      type: array
      items:
        $ref: ../schemas.yml#/Issue
---

# Compare Screenshots

Captures the Storybook screenshot, compares it with the reference, and writes draft issues for triage.

## Phase 1: Capture Storybook Screenshot

1. **Resolve Storybook URL** from `DeboStory` entity:
   ```bash
   _debo story --scene ${scene}
   ```
   Extract the Storybook iframe URL from the story JSON output.

2. **Capture screenshot** using the `playwright-capture` rule:
   - Resolve viewport width from `design-tokens.yml`
   - Use selector from the check's `selector` field
   - Full-page CLI for `full` region, element Node API for named regions (header, footer)
   - Save to `designbook/stories/${storyId}/screenshots/${breakpoint}--${region}.png`

3. **Verify** by reading the captured image.

## Phase 2: Compare

1. **Read both images:**
   - Reference: `${reference_folder}/${breakpoint}--${region}.png`
   - Storybook: `${DESIGNBOOK_DATA}/stories/${storyId}/screenshots/${breakpoint}--${region}.png`

   If either image is missing, skip with a warning.

2. **Collect context:**
   - Design tokens from `design-tokens.yml`
   - Design reference from `vision.yml` (if available)

3. **Compare visually** using multimodal capabilities. Evaluate layout, colors, typography, spacing. Focus on the specific element for named regions.

   Severity: **Critical** (structure wrong), **Major** (colors/fonts off), **Minor** (spacing/opacity).

## Phase 3: Report Issues

Report the issues as a task result — they are **not** published to meta yet. Triage will consolidate and publish them.

**Issue descriptions must be actionable:**
- WHAT deviates (concrete element + property)
- Expected vs. actual value (where discernible)
- WHICH file is affected (`file_hint`)
- Brief reasoning why it is an issue

If no issues found, report an empty array `[]`.

## Output

```
## Compare: {scene} ({breakpoint}/{region})

Storybook screenshot captured.
Visual comparison: 2 issues found (1 major, 1 critical).
Draft issues written — triage will consolidate and publish.
```

> **Note**: This is an AI-based visual comparison using multimodal capabilities, not a pixel-level diff.
