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
result:
  type: object
  required: [build, checks]
  properties:
    build:
      $ref: ../schemas.yml#/StorybookBuild
    checks:
      $ref: ../schemas.yml#/StorybookChecks
---

# Validate Story

Produce successful final build and browser evidence for `story_url` after all
declared artifact writes. The live story reflects those writes and satisfies the
appearance, interaction, responsive and preservation criteria fixed during intake.

Completion: the final build succeeds, every declared browser check passes, and
recorded observations establish the intake criteria on the current rendered story.
