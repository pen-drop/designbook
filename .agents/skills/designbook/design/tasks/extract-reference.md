---
trigger:
  steps: [extract-reference]
domain: [references]
params:
  type: object
  required: [vision]
  properties:
    story_id: { type: string, default: "" }
    reference_folder: { type: string, default: "", resolver: reference_folder }
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      type: object
      $ref: ../../vision/schemas.yml#/Vision
result:
  type: object
  required: [reference_dir, reference]
  properties:
    reference_dir:
      type: string
    reference:
      type: array
      path: "{reference_folder}/extract.json"
      items:
        $ref: ../schemas.yml#/Reference
    screenshot:
      type: string
      default: ""
---

# Extract Reference

Resolves a design reference URL from `vision.yml`, extracts structure into a `DesignReference` (`extract.json`), and returns the reference directory, reference array, and screenshot path.

If `{reference_folder}/extract.json` already exists, return results from it — no extraction needed.

## Result: reference

Built from `extract.json` `source` field. Use `type: "url"` for URLs, `type: "image"` for screenshots.
