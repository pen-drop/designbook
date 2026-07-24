---
name: designbook:design:compare-screenshots
title: "Compare Screenshots: {{ story_id }} ({{ screenshot.breakpoint }}/{{ screenshot.element }}--{{ screenshot.state }})"
trigger:
  steps: [compare, re-compare]
params:
  type: object
  required: [screenshot, reference_dir, story_id]
  properties:
    screenshot:
      $ref: ../schemas.yml#/Screenshot
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
    reference_dir:
      type: string
      description: "Absolute path to the reference directory (references/<hash>/) containing frozen baseline PNGs."
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
each:
  screenshot:
    expr: "story_screenshots"
    schema: { $ref: ../schemas.yml#/Screenshot }
result:
  type: object
  required: [issues, compare_artifacts]
  properties:
    issues:
      type: array
      items:
        $ref: ../schemas.yml#/Issue
    compare_artifacts:
      type: array
      items:
        $ref: ../schemas.yml#/CompareArtifact
---

# Compare Screenshots

Compare each story screenshot against its frozen baseline for the current
`(element, state, breakpoint)` triple.

- Story file: `designbook/stories/{{ story_id }}/screenshots/{{ screenshot.breakpoint }}--{{ screenshot.element }}--{{ screenshot.state }}.png`
- Baseline file: `{{ reference_dir }}/{{ screenshot.breakpoint }}--{{ screenshot.element }}--{{ screenshot.state }}.png`

Use the loaded `screen-compare` rule for the compare procedure.

Emit issues for visual deviations found and one `compare_artifact` entry per screenshot.
If no deviations are found, return an empty issues array and a passing artifact.

## Result: issues

Collect all visual deviations between story screenshot and baseline.
Each issue carries the `severity` returned by the `compare-images` CLI — do not raise or lower it.

## Result: compare_artifacts

One entry per screenshot compared. Carries `story_id`, `breakpoint`, `element`, `state`, `passed`, `diff_percent`, and `severity` from the CLI output.
