---
trigger:
  steps: [generate-index]
domain: [css]
params:
  type: object
  required: [css_generation_plan]
  properties:
    css_generation_plan:
      $ref: ../schemas.yml#/CssGenerationPlan
result:
  type: object
  required: [index-css]
  properties:
    index-css:
      path: "{{ css_generation_plan.paths.index_css_path }}"
      $ref: ../schemas.yml#/IndexCss
---

# Generate CSS Token Index

Generate a barrel file source that imports the token CSS files referenced by the current CSS generation plan.

List the planned token CSS outputs, excluding the index file itself, sorted alphabetically. Write one `@import` per file.

Also include `css_generation_plan.fonts.font_css_path` when the font strategy is not `skip`. The generated font stylesheet should participate in the same barrel file when the workspace manages fonts through generated CSS.

All imports must be written relative to the index file location.
