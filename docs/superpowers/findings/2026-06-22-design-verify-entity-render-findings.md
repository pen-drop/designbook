# Findings — Entity Rendering & Design-Verify Region Selectors

Distilled, non-obvious discoveries from the entity-reference-rendering + design-verify
region-selector work. The code/specs/plans live in the same branch; this is the
"why it broke" knowledge, for the team.

## 1. Entity references render only in slots — never props
`resolveEntityRefs` / `resolveSlots` (builder-registry.ts) resolve entity-reference
nodes (`{entity, view_mode, record}`) **only when they sit in a component's `slots`**
(or at the top level of a scene/mapping). A ref placed in `props` is passed through
verbatim, never resolved → the component receives `{entity,…}` objects instead of
rendered content → empty render. **Rule:** rendered content (markup strings, component
refs, entity refs) is slot-only; props are scalar data. A jsonata mapping output IS a
scene node tree, so the same rule binds `map-entity` and `create-scene` (shared
`scenes-constraints` rule).

## 2. entity-builder must honor `record` (index), not just `select`
Nested entity refs use `record` (a pool index). `entity-builder` originally resolved
only a `select` JSONata predicate and evaluated the child mapping against `{}` when
absent → nested children (e.g. `signage_item` cards) rendered empty even when correctly
placed in a slot. Fix: honor numeric `record` → `entityArray[record]`. This path was
never exercised before (top-level entity stories use `entity-module-builder`, not
`entity-builder`).

## 3. css-tailwind component rules filtered the wrong config key
The 5 `designbook-css-tailwind/rules/*` component rules filtered on
`frameworks.style: tailwind`, but the config (and every install/task/blueprint) uses
`frameworks.css`. `frameworks.style` is defined nowhere → those rules never matched →
`create-component` fell back to hand-written BEM CSS instead of Tailwind utilities. A
latent bug hitting every Tailwind component run. Fix: align the filter key to
`frameworks.css`.

## 4. A verify region needs TWO selectors (story ≠ reference DOM)
The Storybook story DOM (design-system SDC components, e.g. `.page__header`) differs
from the reference site DOM (e.g. Angular `app-site-header`). One selector cannot crop
both. Model: `Region { id, selector (story), reference_selector (reference) }`.
`capture-storybook` crops the story to `check.selector` (addon-consumed, unchanged);
`capture-reference` crops the reference to `check.reference_selector`. A selector that
matches nothing on its side falls back to that side's full capture (never fails).

## 5. A story's "full" capture is `#storybook-root`, not the viewport
Capturing a story with `--full-page` grabs the full 1600px viewport. For an isolated
component (entity story ~440–600px) that is mostly empty space → huge dimension drift
against a region-cropped reference. Empty story selector now element-captures
`#storybook-root` (the rendered story content). Reference URLs still use `--full-page`
for an empty `reference_selector`.

## 6. `overview` is a reserved scene name
Every `*.scenes.yml` auto-exports an `overview` story (the section overview /
DeboSectionPage — `preset.ts` / `buildOverviewStory`). A scene named `overview`
produces a second `export const overview` in the same module → collision → the section
page shadows the scene, so `…-scenes--overview` silently renders the management UI, not
the scene. design-verify then captured the section page (full-page mismatch). Fix: the
`scene` validator rejects scene name `overview`; `screen-scene-constraints` +
`intake--design-screen` forbid it and steer meaningful names (section id / `default`).

## 7. leando.de is Angular — no semantic landmarks
The reference exposes custom-element tags, not `<header>`/`<footer>`/`[role=banner]`:
- header → `app-site-header`
- footer → `app-footer`
- Wegweiser → `app-signage`
Region reference selectors must be the **real** elements supplied by the caller; hardcoded
landmark defaults (`header, [role=banner]`) match nothing on such sites and silently fall
back to full-page.

## 8. Pre-existing bug flagged (NOT fixed here)
`designbook-css-tailwind/.../blueprints/jsonata-template` — `$normalizeCssValue` regex
with a literal `(` breaks jsonata-w with "Unmatched ')'". Surfaced by a css-generate run;
out of scope for this work, left for a separate fix.

## Verified end-to-end (drupal-web, reference leando.de)
- **Entity** (paragraph.signage): story `#storybook-root` 602 vs reference `app-signage` 444 — region-vs-region.
- **Shell** (header/footer): header story `.page__header` 162 vs reference `app-site-header` 162 — region-vs-region.
- **Screen** (homepage scene): full scene 3283 vs full leando.de 4872 — full-vs-full; 64% diff is a real content-volume gap (scene has less below-the-fold than the live homepage), which is design-verify working correctly.
