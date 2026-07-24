---
title: "Generate CSS"
trigger:
  steps: [generate-css]
domain: [css]
params:
  type: object
  required: [css_generation_plan, design_tokens]
  properties:
    css_generation_plan:
      $ref: ../schemas.yml#/CssGenerationPlan
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      workflow: tokens
      type: object
---

# Generate CSS — Execute JSONata

Run the `.jsonata` expression files listed in `css_generation_plan.jsonata.artifacts`. Each file remains self-contained, and its embedded `@config` block specifies the relative input and output paths to use.

If the plan reuses existing JSONata files, execute those in place. If no JSONata artifacts are planned, stop and report that there was nothing to generate.

Report per artifact CSS output: file path and count of `--` custom property declarations. Flag any planned output that is empty or missing as error.

Execute the artifacts in plan order. For every artifact:

1. Resolve `artifact.jsonata_path`
2. Read the embedded `@config`
3. Run the JSONata transform against `design-tokens.yml`
4. Verify that the produced file lands at `artifact.css_path`

Treat any mismatch between the planned output path and the JSONata `@config.output` as an error in the run.
