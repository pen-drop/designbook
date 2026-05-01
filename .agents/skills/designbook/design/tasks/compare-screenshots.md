---
name: designbook:design:compare-screenshots
title: "Compare Screenshots: {{ check.story_id }} ({{ check.breakpoint }}/{{ check.region }})"
trigger:
  steps: [compare]
params:
  type: object
  required: [check, reference_folder]
  properties:
    check:
      type: object
      $ref: ../schemas.yml#/Check
    story_meta:
      path: "designbook/stories/{{ check.story_id }}/meta.yml"
      type: object
      $ref: ../schemas.yml#/StoryMeta
    story_url:
      type: string
      resolve: story_url
      from: check.story_id
    reference_folder:
      $ref: ../schemas.yml#/ReferenceFolder
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
each:
  check:
    expr: "checks"
    schema: { $ref: ../schemas.yml#/Check }
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

Take a Storybook screenshot and compare it against the reference screenshot for
the current check. Use the loaded `screen-compare` rule for the exact capture,
compare, and artifact-writing procedure.

Emit the resulting issues array and one compare artifact entry for this check.
If no issues are found, return an empty issues array and a passing artifact.
