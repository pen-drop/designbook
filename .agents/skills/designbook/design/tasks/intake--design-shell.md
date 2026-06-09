---
trigger:
  steps: [design-shell:intake]
domain: [components, components.shell]
params:
  type: object
  required: [vision, design_tokens]
  properties:
    reference_dir: { type: string, default: "" }
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      type: object
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [components, scenes]
  properties:
    components:
      type: array
      items:
        $ref: ../schemas.yml#/Component
    scenes:
      type: array
      items:
        $ref: ../../scenes/schemas.yml#/SceneDef
    output_path:
      type: string
      default: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
---

# Intake: Design Shell

Plan the application shell -- a `page` component with `header`, `content`, and `footer` slots, composed as a scene named `shell` in `design-system.scenes.yml`.

The `extract-reference` stage runs **before** intake. If `$reference_dir/extract.json` exists, derive the shell layout (landmarks, interactive elements, typography) from it. Otherwise, ask the user about layout pattern, navigation items, footer content, and responsive behavior.

## Steps

1. **Determine layout** — from `$reference_dir/extract.json` landmarks if present, else from user dialog
2. **Plan components** — derive the `components[]` list via the deterministic rule below; resolve `embeds:` from loaded blueprints (leaves before dependents); confirm with user
3. **Structure preview** — ASCII tree per [structure-preview.md](partials/structure-preview.md), root = `page` component, show `content → $content`, title = "Shell Structure"
4. **Existing shell handling** — if `design-system/design-system.scenes.yml` exists, read it and ask whether to update or replace; reuse existing page/header/footer components instead of recreating

### Enumerate `components[]`

The list is derived from two sources with no ad-hoc decisions:

1. **Structural landmarks.** For each top-level entry in `extract.json.landmarks` (`header`, `footer`, `main`, …), emit one component. Nested rows inside a landmark MAY be composed as `section` components when the reference shows distinct backgrounds or borders between rows.

2. **Atoms from prose.** Parse `extract.json.landmarks.*.rows[].content`. For each distinct interactive element or branded mark referenced, emit one component per kind:
   - Logo / wordmark → `logo` (see `logo.md`)
   - CTA button / labelled action → `button` (see `button.md`)
   - Plain text anchor / inline link → `link` (see `link.md`)
   - Non-text symbol (social icons, search glyph, hamburger) → `icon` (see `icon.md`)
   - Anything without a matching convention blueprint → emit a design-specific component with a role-based name (e.g. `lang-switcher`, `search-trigger`, `auth-cta`).

Reuse an existing component when its slots/variants already cover the new need — do not create near-duplicates.

## Result: components

One entry per **new** component. Each item: `component` (name), `slots` (array), `group`.

When the component has visual variants (e.g. logo full vs mark-only, navigation main vs footer), declare them under `variants:` as objects with an `id` field — **snake_case (no hyphens), no `name:`**. A hyphenated id breaks the generated story export (`mark-only` → invalid JS identifier). Example:

```yaml
- component: navigation
  slots: []
  group: Navigation
  variants:
    - id: main
    - id: footer
    - id: mark_only
```

The `id` becomes the story filename segment (`<component>.<id>.story.yml`) and the key in `.component.yml` `variants:`. Submitting `name:` instead fails validation with `must have required property 'id'`.

## Result: scenes

Emit the shell `SceneDef[]` that `create-scene` will append to
`design-system.scenes.yml`. For the shell workflow this normally means a single
scene named `shell`, derived from the extracted landmark structure and using
`$content` as the page-content injection point.
