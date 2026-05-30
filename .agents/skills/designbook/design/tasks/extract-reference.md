---
trigger:
  steps: [extract-reference]
domain: [references]
params:
  type: object
  required: [vision]
  properties:
    reference_folder:
      $ref: ../schemas.yml#/ReferenceFolder
      default: ""
      resolve: reference_folder
      from: vision.design_reference.url
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

## Completeness Requirements

The extracted `DesignReference` is the single source of truth for every downstream stage (intake, create-component, create-scene, verify). All fields below map directly to binding derivations in the `markup-derivation` rule: every row, interactive element, form, image, and breakpoint you populate here MUST be structurally represented in the markup produced by `create-component` and `create-scene`. A field left empty here cannot be used there — thin extraction propagates directly into markup mismatches in `design-verify`.

Treat the schema fields as a checklist — when a field is observable in the reference, it MUST be populated.

### Landmarks and regions

Populate `landmarks` for every visually distinct page landmark that appears in the reference, such as header, footer, navigation, hero, sidebar, toolbar, search area, promo strip, legal bar, or content panels.

For each landmark, split direct visual regions whenever background, border, spacing, layout, purpose, content grouping, or interaction treatment changes. Do not collapse multiple visual regions into one generic row or slot.

For each region capture:
- `bg` — resolved background color (hex or CSS color)
- `height` — measured rendered height
- `padding` — vertical + horizontal padding
- `layout` — `flex`/`grid`/`stack` with direction and alignment
- `gap` — spacing between items
- `content` — concrete enumeration of items in reading order
- `treatment` — short visual role such as brand strip, navigation row, action group, form panel, legal row, card rail, or content band

### Interactive elements

Populate `interactive[]` for every distinct interactive treatment. Classify the visual treatment separately from the semantic role.

Common treatments include:
- text link
- transparent button
- icon-only button
- filled or accent button
- outline button
- input or search control
- menu or dropdown trigger using whichever treatment the reference shows

Do not map every clickable element to a filled or accent button. Preserve the observed treatment.

### Forms

Populate `forms[]` for every form detected (search, newsletter, contact, login …). Inline HTML snippets of labels/inputs in scene YAML are not a substitute — a form must be represented structurally so it can be rendered as a `form` component downstream.

### Images and brand assets — download, don't describe

Populate `images[]` for every logo, icon, partner mark, and static brand asset. Downloads are mandatory when the source URL is reachable:

1. Set `assets_dir` (typically `assets/`) on the `DesignReference`.
2. Resolve the absolute asset URL from the reference page (`<img src>`, `<use href>`, CSS `background-image`, inline `<svg>`).
3. Download to `{reference_folder}/{assets_dir}/<filename>` via `curl -sL "<url>" -o "<path>"`. For inline SVGs, write the `outerHTML` directly to a `.svg` file.
4. Also place a copy (or symlink) under the Storybook `public/` directory so scenes can reference it at the root path — see `blueprints/static-assets.md`.
5. Set `images[].local_path` to the public-path URL (e.g. `/logo.svg`). Leave empty only when the asset is decorative-only (CSS gradients, pure glyphs from icon fonts).

Without `local_path`, scenes fall back to text placeholders — this is the concrete failure mode that the field exists to prevent.

### Breakpoint variation

Populate `breakpoints[]` with every distinct responsive layout change observed (nav collapse, column count, stacked vs. inline) — not just the token id.

### Sections

Populate `sections[]` for every page-level content zone between header and footer in reading order. A missing section in the extract cascades into a missing scene later.

## Verification

Before returning, verify the extract is not thin: if a visible landmark contains multiple visual regions but `landmarks` records it as one aggregate area, if `images.length === 0` on a page with visible brand or content images, or if `forms.length === 0` on a page with a visible search/newsletter/login/contact form, re-extract. Thin extracts are almost always the cause of shell/screen mismatches in verify.
