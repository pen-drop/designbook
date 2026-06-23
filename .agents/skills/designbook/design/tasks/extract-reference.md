---
title: "Extract Reference"
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
      from: reference_url
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      type: object
      $ref: ../../vision/schemas.yml#/Vision
    elements:
      type: array
      description: "Named comparison subjects (id + reference selector). When not supplied, ask the user which page regions to capture."
      items:
        $ref: ../schemas.yml#/Element
    breakpoints:
      type: array
      description: "Breakpoint ids to capture (e.g. sm, md, lg). When not supplied, ask the user which breakpoints to include."
      items:
        $ref: ../schemas.yml#/BreakpointId
result:
  type: object
  required: [reference_dir]
  properties:
    reference_dir:
      $ref: ../schemas.yml#/ReferenceFolder
    reference:
      type: object
      path: "{{ reference_folder }}/meta.yml"
      $ref: ../schemas.yml#/Reference
    reference_screenshots:
      type: array
      items:
        $ref: ../schemas.yml#/Screenshot
---

# Extract Reference

Resolves a design reference URL from `vision.yml`, extracts structure into a `DesignReference` (`extract.json`), writes the `Reference` (`meta.yml`), and emits the baseline screenshot matrix.

## No reference

When `reference_folder` is empty (the project has no design reference), there is nothing to extract. Complete the task with `reference_dir: ""`, do not submit `reference`, and return an empty `reference_screenshots` list — no extraction, no asset download, no files written. Downstream stages run reference-free.

## Stable baseline — reuse or accumulate

When `{{ reference_dir }}/meta.yml` already exists and `--refresh-reference` is not set, load the existing `Reference` from `meta.yml` and reconstruct `reference_screenshots` from it — no re-extraction needed. Any baseline PNG that already exists alongside `meta.yml` is frozen and will be reused by `ensure-baseline` without re-capturing. With `--refresh-reference`, delete all `*.png` files in `{{ reference_dir }}/` before proceeding so every baseline is re-captured fresh; `extract.json` and `meta.yml` are still regenerated.

If `{{ reference_dir }}/extract.json` already exists (and neither `meta.yml` is missing nor `--refresh-reference` is set), return results from it without re-extracting.

## Ask: elements and breakpoints

When `elements` or `breakpoints` are not supplied as params, ask the user before extracting:

- **Breakpoints**: which viewport sizes to cover (e.g. `sm`, `md`, `lg`, `xl`). Default to all breakpoints found in `design-tokens.yml`.
- **Elements**: which named subjects to compare (id + CSS selector on the reference page). Use stable surface ids such as `scene-header`, `scene-footer`, `scene-hero`, `entity-<entity_type>-<bundle>-<view_mode>`, or `component-<name>`. Reserve `full` for a true whole-page or whole-screen comparison; use an empty selector to express full-area capture instead of naming the subject `full`. Ask the user to confirm or extend the default set derived from extracted landmarks.

Persist the confirmed values into the `Reference` `elements` array written to `meta.yml`.

## Write meta.yml

After extraction completes, write `{{ reference_dir }}/meta.yml` as a `Reference`:

- `source`: populate from the reference URL's resolved origin, screenId (when available from vision.yml), and hasMarkup flag.
- `elements`: the confirmed element list. For each element, derive `states` from `extract.json`'s `interactive[]` entries whose selector matches the element's selector — add each `CaptureState` found (name + steps). If no interactive behavior is found, default to `[{ name: rest }]`.
- `extract`: `"extract.json"` (relative path to the DesignReference).
- `assets_dir`: `"assets/"`.

## Result: reference_screenshots

Materialize `reference_screenshots` as the full element × state × breakpoint matrix. For each element in `Reference.elements`, for each state in `element.states`, for each breakpoint in `element.breakpoints` (or the task-level `breakpoints` param when the element carries none), emit one `Screenshot`:

```
{ element: element.id, state: state.name, breakpoint: bp, selector: element.selector }
```

`ensure-baseline` receives this list via its `each` expansion and captures any PNG that does not yet exist beside `meta.yml`.

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

#### Interactive behavior — trigger, don't just describe

When an element does more than restyle on hover/focus — it shows, hides, or activates another element (a menu, off-canvas panel, dropdown, overlay, tab set, or accordion) — record its behavior, not only its resting look. Classifying the treatment is not enough: a trigger captured only at rest yields inert markup downstream and an open state no one ever saw.

For each such element populate `behavior` (the interaction pattern), `target` (selector of the element it controls), and `aria` (the attribute that flips). Then actually exercise it: drive each non-rest condition and record it as a `CaptureState` (a `name` plus the `steps` — the clicks/hovers — that reach it). The icons or panels that only exist in the activated state (e.g. a close icon, a chevron, a revealed submenu) are observable only after triggering, and they are exactly what downstream markup must reproduce.

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

### Fonts — download, don't describe

Populate `fonts[]` for every web font the reference renders text with. Recording only the family name and weights is not enough: a `self-hosted` (or `adobe`/`other`) family with no downloaded binary leaves the downstream token CSS with an unresolvable `font-family` and a silent serif fallback — the exact failure this step prevents.

For each family classify `source` (`self-hosted`, `google`, `adobe`, `system`, `other`). `google` and `system` families need no download — css-generate fetches Google families later. For every other source, downloads are mandatory when the binary URL is reachable:

1. Inspect the reference page's `@font-face` rules and stylesheet links to resolve each family's binary URL (the `src: url(...)` entries) and the weight/style each file covers.
2. Download to `{reference_folder}/{assets_dir}/fonts/<filename>` via `curl -sL "<url>" -o "<path>"`. Prefer `woff2` when multiple formats are offered.
3. Record each downloaded binary as a `files[]` entry with `weight`, `style`, `format`, `src_url`, and `local_path`.

This makes the reference the single source of truth for brand fonts that no font registry can supply — `css-generate` then binds the token to a family that actually has `@font-face` coverage instead of a placeholder.

### Breakpoint variation

Populate `breakpoints[]` with every distinct responsive layout change observed (nav collapse, column count, stacked vs. inline) — not just the token id.

### Sections

Populate `sections[]` for every page-level content zone between header and footer in reading order. A missing section in the extract cascades into a missing scene later.

## Verification

Before returning, verify the extract is not thin: if a visible landmark contains multiple visual regions but `landmarks` records it as one aggregate area, if `images.length === 0` on a page with visible brand or content images, if `forms.length === 0` on a page with a visible search/newsletter/login/contact form, or if any `fonts[]` family whose `source` is not `google` or `system` has no `files[]`, re-extract (and download the missing binaries). Thin extracts are almost always the cause of shell/screen mismatches in verify — a missing font binary surfaces as a typography fallback the compare stage cannot recover.
