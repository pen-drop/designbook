## Why

The `design-screen` workflow produces components with arbitrary Tailwind utility classes for font sizes, weights, and line heights (e.g. `text-sm`, `font-bold`). These don't match the design reference because there are no typography scale tokens — `design-tokens.yml` only defines `fontFamily` (Inter, Space Grotesk), and `css-generate` explicitly skips composite typography tokens (`$type: typography`). Components have no token-based values to reference, so visual output diverges significantly from the Stitch reference.

## What Changes

- **Extend `design-tokens.yml` schema** to support a typography scale under `semantic.typography` — font sizes, font weights, and line heights for semantic roles (display, headline, title, body, label).
- **Update `css-generate` pipeline** to generate CSS custom properties for the typography scale, not just fontFamily. The `jsonata-template` blueprint currently skips `$type: typography` — it must handle composite tokens and emit `--text-*` properties.
- **Update `css-mapping` blueprint** to add a `typography-scale` group mapping that generates size/weight/line-height properties alongside the existing `typography` (fontFamily) group.
- **Add a component typography rule** that requires components to use generated typography tokens (`var(--text-*)`) instead of arbitrary Tailwind size classes.
- **Update `tokens:intake` task** to collect typography scale values from the design reference (Stitch), not just font families.
- **Add Google Fonts download task** under `designbook/css-generate/fonts/google/` — a dedicated `download-fonts` task gated by `when: extensions: google-fonts` that fetches Google Fonts CSS based on fontFamily tokens. Runs as a separate step before standard CSS generation.

## Capabilities

### New Capabilities
- `typography-scale-tokens`: Define and generate CSS custom properties for a semantic typography scale (display, headline, title, body, label) with font-size, font-weight, and line-height per role.
- `component-typography-rule`: Rule enforcing that components reference typography tokens instead of arbitrary utility classes for font sizing.
- `google-fonts-css`: Download task in `designbook/css-generate/fonts/google/` gated by `extensions: google-fonts` that fetches Google Fonts CSS.

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **Skill files affected:**
  - `designbook-css-tailwind/blueprints/css-mapping.md` — add typography-scale group
  - `designbook-css-tailwind/blueprints/jsonata-template.md` — handle composite typography tokens
  - `designbook/tokens/tasks/intake--tokens.md` — collect typography scale from reference
  - New rule in `designbook-drupal/components/rules/` or `designbook/design/rules/` for token-based typography
- **Design tokens schema** — new entries under `semantic.typography` for scale roles
- **Generated CSS** — new `typography-scale.src.css` with `--text-*` custom properties
- **Existing components** — will need to adopt typography tokens (but that's a downstream concern, not part of this change)
- **Core skill** — new `css-generate/fonts/google/` directory in `designbook` with download-fonts task (gated by `extensions: google-fonts`)
