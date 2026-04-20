# Audit: Legacy Body-Prose Schema Extensions

**Date:** 2026-04-20
**Trigger:** Rules refactor (`docs/superpowers/specs/2026-04-20-skill-creator-rules-refactor-design.md`), success criterion 8.
**Source checks:** `RULE-01` in `.agents/skills/designbook-skill-creator/rules/rule-files.md`, `BLUEPRINT-03` in `.agents/skills/designbook-skill-creator/rules/blueprint-files.md`.

## Scope

This audit lists every rule and blueprint file in the production skills that currently
describes schema extensions as body prose — enum values, required fields, default values,
additional properties — instead of using the `extends:` / `provides:` / `constrains:`
frontmatter mechanism.

**In scope:** `.agents/skills/designbook/**/rules/`, `.agents/skills/designbook/**/blueprints/`,
`.agents/skills/designbook-drupal/rules/`, `.agents/skills/designbook-drupal/blueprints/`,
`.agents/skills/designbook-css-tailwind/rules/`, `.agents/skills/designbook-css-tailwind/blueprints/`,
`.agents/skills/designbook-stitch/rules/`, `.agents/skills/designbook-stitch/blueprints/`,
`.agents/skills/designbook-devtools/rules/`, `.agents/skills/designbook-devtools/blueprints/`.

**Out of scope:** this document does not fix the files. Migration of each finding is a
separate change tracked as a follow-up plan.

## Findings — RULE-01 (rule files)

| Skill | File | Lines | What the prose describes | Proposed frontmatter form |
|---|---|---|---|---|
| designbook-drupal | data-model/rules/canvas.md | 14-18 | Declares `canvas_page` bundles always have `purpose: layout-builder` and specific `view_modes` template values | `constrains:` |
| designbook-drupal | data-model/rules/layout-builder.md | 14-18 | Declares bundles with `purpose: landing-page` require specific `view_modes` templates and the `layout_builder__layout` field | `extends:` |
| designbook-drupal | data-model/rules/drupal-views.md | 13-14 | Declares `view` entities must set `view_modes.default.template: list-view` | `constrains:` |

## Findings — BLUEPRINT-03 (blueprint files)

| Skill | File | Lines | What the prose describes | Proposed frontmatter form |
|---|---|---|---|---|
| designbook-drupal | components/blueprints/button.md | 16-21 | Declares the `variant` enum values (`primary`, `outline`, `ghost`, `default`) and `size` enum `[sm, md, lg]` | `provides:` |
| designbook-drupal | components/blueprints/container.md | 33-37 | Declares enums and defaults for `max_width`, `padding_top`, `padding_bottom`, `display_header` props | `provides:` |
| designbook-drupal | components/blueprints/grid.md | 32-33 | Declares `columns` enum `[1,2,3,4]` default `1` and `gap` enum `[none,sm,md,lg]` default `"md"` | `provides:` |
| designbook-drupal | components/blueprints/section.md | 39-45 | Declares enums and defaults for all seven props passed to container and grid sub-components | `provides:` |
| designbook-drupal | components/blueprints/form.md | 33-35 | Declares `label_display` and `description_display` enums with defaults `"before"` and `"after"` | `provides:` |
| designbook-drupal | components/blueprints/header.md | 21 | Declares `sticky` boolean prop with default `false` | `provides:` |
| designbook-drupal | components/blueprints/icon.md | 18 | Declares `size` enum `[sm, md, lg]` with default `md` | `provides:` |
| designbook-drupal | components/blueprints/link.md | 17-19 | Declares `variant` enum `[default, subtle, external]` | `provides:` |
| designbook-drupal | components/blueprints/logo.md | 17-19, 23-25 | Declares `variant` enum `[full, mark-only, inverse]` and `href` default `/` | `provides:` |
| designbook-drupal | components/blueprints/navigation.md | 16-17 | Declares `variant` enum `[main, footer]` with default `"main"` | `provides:` |

## Summary

| Metric | Value |
|---|---|
| Rule files flagged | 3 |
| Blueprint files flagged | 10 |
| Skills with at least one finding | 1/5 |

All findings are concentrated in `designbook-drupal`. The other four production skills
(`designbook`, `designbook-css-tailwind`, `designbook-stitch`, `designbook-devtools`)
produced no `RULE-01` or `BLUEPRINT-03` hits during the smoke-check. `designbook-devtools`
does not exist as a skill directory and was skipped.

## Next steps

These findings are tracked for a follow-up refactor. The migration pattern per finding is:

1. Move the body prose constraint/default into frontmatter via `extends:`, `provides:`, or `constrains:` — pick based on the form table in `.agents/skills/designbook-skill-creator/rules/rule-files.md#schema-extension-as-core-mechanism` (for rules) or the equivalent section in `blueprint-files.md` (for blueprints).
2. Remove the now-redundant prose from the body. If the prose included explanatory narrative beyond the constraint/default, keep only the narrative.
3. Re-run the validator — the `RULE-01` / `BLUEPRINT-03` finding for that file should disappear.

Files with no findings need no action.
