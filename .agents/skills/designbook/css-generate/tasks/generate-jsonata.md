---
title: "Generate JSONata: {{ artifact.group }}"
trigger:
  steps: [generate-jsonata]
domain: [css]
params:
  type: object
  required: [artifact, css_generation_plan, design_tokens]
  properties:
    artifact:
      $ref: ../schemas.yml#/CssArtifactPlan
    css_generation_plan:
      $ref: ../schemas.yml#/CssGenerationPlan
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      workflow: tokens
      type: object
result:
  type: object
  required: [generate-jsonata]
  properties:
    generate-jsonata:
      path: "{{ artifact.jsonata_path }}"
      $ref: ../schemas.yml#/Jsonata
      validators:
        - "cmd:npx jsonata-w transform --dry-run {{ file }}"
        - "cmd:npx jsonata-w transform --dry-run {{ file }} | npx stylelint --stdin-filename output.css"
each:
  artifact:
    expr: "css_generation_plan.jsonata.artifacts"
    schema: { $ref: ../schemas.yml#/CssArtifactPlan }
---

# Generate JSONata Expression

Generate one `.jsonata` expression file per planned CSS artifact. The expression transforms `design-tokens.yml` into the artifact's target CSS file.

Read the `jsonata-template` blueprint for the expression format. Use the current `artifact` values for the token path, CSS prefix, wrapper, JSONata destination, and relative `@config.output` path.

The generated JSONata source must:

- keep `input` relative to the JSONata file's location
- use `artifact.config_output_path` as the `@config.output`
- preserve the active framework's mapping semantics from the blueprint

When `css_generation_plan.jsonata.strategy` is:

- `create` — write a fresh JSONata file for every artifact
- `refresh` — overwrite the existing JSONata file in place using the current artifact plan
- `reuse` — keep the existing JSONata file content if it already exists at `artifact.jsonata_path`; only regenerate missing files

If a reused JSONata file already exists and still matches the current artifact plan, submit that file unchanged as the task result instead of inventing a new variant.
