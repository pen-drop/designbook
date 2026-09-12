---
name: designbook:design:compare-screenshots
title: >-
  Compare Screenshots: {{ story_id }} ({{ screenshot.breakpoint }}/{{ screenshot.element }}--{{
  screenshot.state }})
trigger:
  steps:
    - compare
    - re-compare
params:
  type: object
  required:
    - screenshot
    - reference_query
    - actual_path
    - story_id
  properties:
    screenshot:
      $ref: ../schemas.yml#/Screenshot
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
    reference_query:
      $ref: ../schemas.yml#/FrozenObservationQuery
    actual_path:
      type: string
      description: Exact absolute path of the actual screenshot declared by the predecessor capture task.
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required:
    - issues
    - compare_artifacts
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

Measured deviations between the bound source observation cell and the exact
actual screenshot produced by the predecessor capture task. The source cell may
use a different native subject, view and state identity from the actual render.
Every selected comparison produces one measured artifact and its complete issues.

## Result: issues

Visual deviations with the deterministic severity returned by the comparison.

## Result: compare_artifacts

One artifact per actual screenshot, preserving its identity, exact source and
actual image paths, measured deviation and severity.
