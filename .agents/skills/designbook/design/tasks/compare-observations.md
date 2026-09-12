---
title: Compare published observations
trigger:
  steps: [compare-observations]
params:
  type: object
  required: [story_id, comparison]
  properties:
    story_id: { $ref: '../../scenes/schemas.yml#/StoryId' }
    comparison: { $ref: '../schemas.yml#/ObservationComparison' }
result:
  type: object
  required: [issues, compare_artifacts]
  properties:
    diff:
      path: '{{ comparison.diff_path }}'
      submission: direct
      validators: [image]
      $ref: '../schemas.yml#/CaptureFile'
    issues:
      type: array
      items: { $ref: '../schemas.yml#/Issue' }
    compare_artifacts:
      type: array
      items: { $ref: '../schemas.yml#/ObservationCompareArtifact' }
---

# Compare published observations

Measured visual and structural findings for the explicitly corresponding source
and actual observation cells. Every selected cell has one comparison artifact;
missing evidence produces a blocked check rather than a visual pass.
