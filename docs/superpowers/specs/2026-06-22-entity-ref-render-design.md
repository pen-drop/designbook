# Entity Reference Rendering Fix — Design

**Branch:** `feat/entity-ref-render-content-check`

**Goal:** Fix the designbook skill so entity reference fields generate correct `.jsonata`
mappings: rendered child entities go into **slots** (resolved at build time), child
bundles get their own component + mapping, and the parent component renders the slot.
Eliminate the "empty boxes" failure where referenced children never render.

## Problem

For `paragraph.signage` (a Wegweiser holding `signage_item` children), the generated
output rendered empty boxes. Root cause chain:

1. **Renderer contract:** `resolveEntityRefs` (builder-registry.ts) resolves entity
   reference nodes (`{entity, view_mode, record}`) only when they appear in a
   component's **slots** or as **top-level** scene nodes — never inside `props`.
   (`resolveSlots` walks slots; props are passed through verbatim.)
2. **Component mis-design:** `intake`/`create-component` built `signage` with `items`
   as a flat **prop** array + a Twig that iterates flat per-card fields, and created
   **no** `signage_item` component.
3. **Mapping forced into props:** with only a flat `items` prop to fill, `map-entity`
   emitted the child entity refs into `props.items` → never resolved. Twig saw
   `{entity, view_mode, record}` objects instead of `{icon, title, …}` → all fields
   undefined → empty `<article>` boxes.
4. **No child mapping:** `intake` emitted a single-element `entity_mappings`, so no
   `paragraph.signage_item.full.jsonata` was produced — even a correctly-placed slot
   ref would have had nothing to resolve to.

## Principle

A `.jsonata` mapping output is structurally identical to a scene node tree. Therefore
the same constraint governs both:

> **Rendered content — markup strings, component references, and entity reference
> nodes — MUST be slot values, never props. Props carry scalar data only (no markup,
> no component/entity nodes). The renderer resolves component/entity references only
> inside slots (and at top level); a reference placed in props is never resolved and
> renders empty.**

This rule is **shared**, not duplicated: it lives in the scene-constraints rule, which
already loads for both `create-scene` and `map-entity`.

## Changes (leaf-first)

### 1. `design/rules/scenes-constraints.md` (shared rule; already triggers on `map-entity`)
Add the principle above as a hard ⛔ constraint, with a correct/wrong example showing
entity refs in a slot vs. in props. Reconcile the existing line ("…props: that accept
HTML") so it no longer implies props may carry markup — rendered HTML is slot-only.

### 2. `design/tasks/intake--design-entity.md`
- `entity_mappings`: emit one mapping for the chosen bundle **plus every referenced
  renderable child bundle** reached by traversing `type: reference` fields (leaf-first) —
  not a single-element array.
- `components`: plan one component per **new renderable bundle** (parent + each child
  bundle that has no existing component), not just the parent.
- Parent component plan: a `type: reference` field that renders children is planned as a
  **slot** on the parent component, never a flat data prop.

### 3. `designbook-drupal/.../data-mapping/blueprints/field-map.md` + `design/tasks/map-entity--design-screen.md`
Promote the soft "*typically as slot values*" guidance to a hard rule: reference fields
emit entity-ref nodes **in a slot**. The only exception — entity refs as top-level array
items — is reserved for pure delegation parents (e.g. a landing page stacking its
paragraph sections), which have no wrapping markup of their own.

### 4. `designbook-drupal/components/tasks/create-component.md` (+ component blueprint if needed)
A reference field that renders children becomes a **slot** in `<name>.component.yml`, and
the Twig renders `{{ slot }}` (the resolved child component nodes). The parent must NOT
iterate flat per-child fields and must NOT declare the children as a flat prop array.

## Correct signage output (target)

```jsonata
// paragraph.signage.full.jsonata
{ "component": "…:signage",
  "props":  { "style": field_paragraph_style, "overlapping": field_overlapping_top },
  "slots":  { "items": $map(field_signage_item, function($id, $i) {
                 { "entity": "paragraph.signage_item", "view_mode": "full", "record": $i } }) } }
```
```jsonata
// paragraph.signage_item.full.jsonata  (own component; flat card props)
{ "component": "…:signage_item",
  "props": { "icon": field_icon, "title": field_title, "description": field_description, … },
  "slots": { … links / buttons as needed … } }
```
- `signage.twig` renders `{{ items }}` (slot holding resolved `signage_item` components).
- `signage_item.twig` renders icon / title / description / links / CTA buttons.

## Out of scope
- **Content-check stage** (pre-verify DOM assertion) — deferred; user handles later.
- **design-screen intake parity** — the shared `map-entity` + `create-component` fixes
  benefit design-screen automatically; design-screen's own intake is checked for the same
  child-mapping gap during implementation and aligned only if it shares the limitation.

## Testing
- `designbook-skill-creator` rules loaded before editing any task/rule/blueprint.
- Re-run `/debo test drupal_web design-entity` (signage, reference leando.de, selector
  app-signage). Expect: `paragraph.signage.full.jsonata` + `paragraph.signage_item.full.jsonata`,
  a `signage` and a `signage_item` component, filled cards (not empty boxes),
  `pnpm build-storybook` clean.
- `pnpm check` green.
