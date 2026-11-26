---
trigger:
  domain: [data-model]
filter:
  backend: drupal
---

# Rule: Which Drupal Surfaces Are Theme Surfaces

This is the concrete criterion behind the backend-neutral theme builder decision: for a
Drupal project it names which surfaces bind declaratively (config) and which bind only through
theme methods (a theme template). The decision stays deterministic — never a per-mode
judgement.

## Declaratively bindable → a declarative builder (config)

A surface whose presentation can be expressed through **UI Patterns 2** display config is
declaratively bindable and uses a declarative builder — `entity-binding` for field-driven content.
Field-rendered content reaches its component through UI-Patterns slots (a `field_block` in its
slot region), attributes and control values through props. This is the normal case for a bundle's
read displays.

## Theme-methods-only → `builder: theme`

A surface whose presentation can be produced **only** by Drupal theme markup — not by UI-Patterns
display config — is a theme surface and uses `builder: theme`. The clearest case
is an **edit form** (a `form_mode` display reached over an edit route): Drupal renders forms through
the form builder and theme layer, not through UI-Patterns display config.

A mode that is a theme surface carries `builder: theme`; `sync-to` then generates its
theme template (the Twig *how* is the theme template blueprint) alongside the display
config that binds it.

## The view build-form matrix

A view is not a blanket theme surface — whether it has a view theme template at all, and
whether its pager and exposed filter are theme surfaces, depends on its `builder`: the same
backend-neutral value every surface's `builder` resolves against, sourced from
`entity_mapping.builders`.

| `builder` | View wrapper | Pager / exposed filter |
|---|---|---|
| A Display Builder form | No view theme template. The view binds directly through the Display Builder page config — a single config owner covers the wrapper, rows, pager, and exposed filter. | Expressed inside that same config owner, not as a separate theme surface. |
| Any other form | The view wrapper **is** a theme template (theme-methods-only, same as an edit form). | Rendered separately and passed into the wrapper as slots — still theme surfaces on their own binding. |

Resolving `builder` first is what decides the branch; a view is never assigned
`builder: theme` independent of that resolution.

## Field content stays in slots, unchanged

Choosing `theme` for a form/wrapper/pager/exposed-filter surface does not move field-rendered
content out of slots: the field→slot mapping for read displays is unchanged. A theme template
renders the theme-methods-only chrome around fields; the fields themselves still render through
their formatter into slots.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| PTS-01 | error | A view whose `builder` is a Display Builder form has no separate view theme template — its wrapper, rows, pager, and exposed filter all resolve through the single Display Builder config owner | body |
| PTS-02 | error | Exactly one container owns the space beneath the view entity — the Display Builder config owner in that branch, or the theme template wrapper in the other; never both, never a second wrapper around either | body |
