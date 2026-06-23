---
trigger:
  steps: [create-component]
filter:
  frameworks.component: sdc
---

# Reference Field Semantics

SDC templates MUST render Drupal field props according to the visual treatment observed in
the design reference, not according to the raw field name or storage value.

## Raw Values Are Not UI

Do not render raw field storage values when the reference shows a richer treatment:

- icon-ish values render as icon treatments, not visible text labels.
- link fields render as the observed link or CTA treatment, not debug text.
- auth/user action fields render only when the reference shows them in the captured state.
- HTML-like field strings are parsed or normalized into structured props before rendering;
  templates must not depend on stringifying raw markup.

## Interactive Treatment Wins

When multiple fields could become an action, choose the field whose label and placement match
the reference-visible interactive element. Do not render every link/button-ish field just
because it exists in the entity record.

Examples:

- A card with one visible filled CTA gets one rendered action, even if the entity also has
  anonymous/authenticated variants.
- A reference that shows a text link gets a text-link treatment, not a filled button.
- A reference that shows a filled CTA gets button-like markup, not an underlined body link.

## Story Data Contract

Default stories must use the same prop shapes that entity mappings produce:

- links are arrays of objects with `title`/`url` (or equivalent label/url keys).
- buttons/actions are objects with `title`/`url`.
- icon props carry the icon identifier only; the Twig template is responsible for rendering
  the visual icon treatment.

If the generated story shows raw icon names, placeholder `Link` labels, duplicate action
buttons, or auth-only actions that are absent from the reference state, the component is not
complete.

## Field Cardinality Boundary

Drupal multi-value fields keep a field-level rendering boundary. If a component
receives a multi-value field, render it through a repeated field treatment,
field-level component, slot, or Twig loop that preserves the full item list.
Do not silently render only the first value as if it were a single scalar.

Single-value fields may expose inner values directly as component props when the
reference shows an atomic treatment, such as one title, one icon, one image, or
one CTA.

Entity reference fields follow the same rule. A multi-value reference slot must
render every resolved child entity in the field list. The parent component must
not reach through the reference and render child fields such as title, icon, or
link itself; the referenced bundle's component and mapping own that markup.
Every resolved reference is rendered with the referenced bundle's own view mode;
the parent component only provides the slot where that rendered output appears.
