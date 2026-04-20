---
trigger:
  steps: [extract-reference]
domain: [references]
params:
  type: object
  required: [vision]
  properties:
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
      default: ""
    reference_folder:
      $ref: ../schemas.yml#/ReferenceFolder
      default: ""
      resolver: reference_folder
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      type: object
      $ref: ../../vision/schemas.yml#/Vision
result:
  type: object
  required: [reference_dir, reference]
  properties:
    reference_dir:
      $ref: ../schemas.yml#/ReferenceFolder
    reference:
      type: object
      path: "{{ reference_folder }}/extract.json"
      $ref: ../schemas.yml#/DesignReference
    screenshot:
      type: string
      default: ""
---

# Extract Reference

Resolves a design reference URL from `vision.yml` and extracts structure into a `DesignReference` (`extract.json`).

If `{reference_folder}/extract.json` already exists, return results from it — no extraction needed.

