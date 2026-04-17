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
  required: [component]
  properties:
    component:
      type: array
      items:
        $ref: ../schemas.yml#/Component
    output_path:
      type: string
      default: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
---

# Intake: Design Shell

Plan the application shell -- a `page` component with `header`, `content`, and `footer` slots, composed as a scene named `shell` in `design-system.scenes.yml`.

The `extract-reference` stage runs **before** intake. If `$reference_dir/extract.json` exists, derive the shell layout (landmarks, interactive elements, typography) from it. Otherwise, ask the user about layout pattern, navigation items, footer content, and responsive behavior.

## Steps

1. **Determine layout** — from `$reference_dir/extract.json` landmarks if present, else from user dialog
2. **Plan components** — scan existing components, list shell components needed (page, header, footer, navigation, plus atomic elements that appear 2+ times or are interactive); resolve `embeds:` from loaded blueprints (leaves before dependents); confirm with user
3. **Structure preview** — ASCII tree per [structure-preview.md](partials/structure-preview.md), root = `page` component, show `content → $content`, title = "Shell Structure"
4. **Existing shell handling** — if `design-system/design-system.scenes.yml` exists, read it and ask whether to update or replace; reuse existing page/header/footer components instead of recreating

## Result: component

One entry per **new** component. Each item: `component` (name), `slots` (array), `group`.
