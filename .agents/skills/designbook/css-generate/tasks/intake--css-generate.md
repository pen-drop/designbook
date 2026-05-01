---
trigger:
  steps: [css-generate:intake]
domain: [css, tokens]
params:
  type: object
  required: [design_tokens]
  properties:
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
      $ref: ../../tokens/schemas.yml#/DesignTokens
result:
  type: object
  required: [css_generation_plan]
  properties:
    css_generation_plan:
      $ref: ../schemas.yml#/CssGenerationPlan
---

# Intake: CSS Generate

Inspect the workspace CSS environment, decide whether existing generated assets can be reused, and emit the full plan that downstream stages execute.

## Step 1: Inspect the Environment

Read the active CSS framework from the workspace config, then inspect the configured CSS directories for existing JSONata files, generated token CSS, generated font CSS, and downloaded font binaries.

Derive the candidate workspace-relative paths from the current config:

- `jsonata_dir` — stable framework-specific location under `designbook/designbook-css-$DESIGNBOOK_FRAMEWORK_CSS`
- `tokens_dir` — configured token CSS directory
- `fonts_dir` — sibling `fonts/` directory next to the configured token CSS directory unless the workspace already uses another location consistently
- `font_css_path` — generated font stylesheet inside the token CSS directory
- `index_css_path` — generated token barrel file inside the token CSS directory

Then collect:

- all existing `.jsonata` files in `jsonata_dir`
- each existing JSONata file's embedded `@config.output`
- generated CSS files referenced by those outputs
- existing font stylesheet at `font_css_path`
- existing downloaded font binaries in `fonts_dir`
- modification times for `design-tokens.yml`, existing JSONata files, and generated CSS files

Use this inspection to decide whether the workflow should:

- `create` new JSONata/CSS assets because they do not exist yet
- `reuse` existing JSONata/CSS assets because they are still current
- `refresh` JSONata/CSS assets because `design-tokens.yml` is newer or the current config no longer matches the existing outputs

When JSONata files already exist and `design-tokens.yml` is newer, verify that the existing JSONata outputs still match the current workspace CSS directories before deciding to reuse them.

Treat an existing JSONata set as still matching only when all of the following are true:

- every expected group file already exists in `jsonata_dir`
- every existing `@config.output` still points to the current token CSS directory
- no existing JSONata file points to a stale or foreign output location

If the JSONata locations still match but `design-tokens.yml` is newer, choose `refresh`.
If the locations no longer match, choose `refresh` and emit the new configured destinations.
Only choose `reuse` when the JSONata set matches and the generated CSS outputs are at least as new as `design-tokens.yml`.

For fonts, decide separately:

- `reuse` when the existing font stylesheet and expected binaries already exist and still match the selected directories
- `refresh` when the stylesheet exists but tokens or font files changed
- `create` when no generated font assets exist yet
- `skip` when the workspace should not emit a generated font stylesheet for the current token set

## Step 2: Emit the Plan

Use the active framework's `css-mapping` blueprint to derive the JSONata/CSS artifact list. Emit one artifact per blueprint row whose token `path` exists in `design-tokens.yml` and contains at least one leaf token.

For each emitted artifact, compute:

- `jsonata_path` in the stable `jsonata_dir`
- `css_path` in the selected token CSS directory
- `config_output_path` as the relative path from `jsonata_path` to `css_path`

Keep `jsonata_path` stable across runs. Only the CSS output destinations may change when the workspace CSS environment changes.

The emitted `css_generation_plan` must include:

- the active framework and overall mode (`create`, `reuse`, or `refresh`)
- the selected workspace-relative directories for JSONata, token CSS, fonts, and index CSS
- the JSONata strategy plus one `CssArtifactPlan` per generated output
- the font strategy plus the selected font stylesheet and font-binary locations

When the plan reuses existing JSONata or font assets, keep their current destinations. When it creates or refreshes assets, propose destinations derived from the current workspace CSS configuration.

Populate `reasons` with the concrete facts that led to the decision, such as:

- `no-jsonata`
- `jsonata-matches-config`
- `tokens-newer-than-jsonata`
- `generated-css-up-to-date`
- `config-output-mismatch`
- `font-assets-found`
- `font-assets-missing`

Do not include icon discovery or icon planning in this workflow.
