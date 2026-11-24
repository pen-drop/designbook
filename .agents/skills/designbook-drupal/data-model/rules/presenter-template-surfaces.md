---
trigger:
  domain: [data-model]
filter:
  backend: drupal
---

# Rule: Which Drupal Surfaces Are Presenter-Template Surfaces

This is the concrete criterion behind the backend-neutral presenter-template decision: for a
Drupal project it names which surfaces bind declaratively (config) and which bind only through
theme methods (a presenter-template). The decision stays deterministic — never a per-mode
judgement.

## Declaratively bindable → a declarative template (config)

A surface whose presentation can be expressed through **UI Patterns 2** display config is
declaratively bindable and uses a declarative template — `field-map` for field-driven content.
Field-rendered content reaches its component through UI-Patterns slots (a `field_block` in its
slot region), attributes and control values through props. This is the normal case for a bundle's
read displays.

## Theme-methods-only → `template: presenter`

A surface whose presentation can be produced **only** by Drupal theme markup — not by UI-Patterns
display config — is a presenter-template surface and uses `template: presenter`. The clearest case
is an **edit form** (a `form_mode` display reached over an edit route): Drupal renders forms through
the form builder and theme layer, not through UI-Patterns display config.

A mode that is a presenter surface carries `template: presenter`; `sync-to` then generates its
presenter-template (the Twig *how* is the presenter-template blueprint) alongside the display
config that binds it.

## The view build-form matrix

A view is not a blanket presenter-template surface — whether it has a view-presenter at all, and
whether its pager and exposed filter are presenter surfaces, depends on its `build_form`: the same
backend-neutral value every surface's `template` resolves against, sourced from
`entity_mapping.templates`.

| `build_form` | View wrapper | Pager / exposed filter |
|---|---|---|
| A Display Builder form | No view-presenter. The view binds directly through the Display Builder page config — a single config owner covers the wrapper, rows, pager, and exposed filter. | Expressed inside that same config owner, not as a separate presenter surface. |
| Any other form | The view wrapper **is** a presenter-template (theme-methods-only, same as an edit form). | Rendered separately and passed into the wrapper as slots — still presenter surfaces on their own binding. |

Resolving `build_form` first is what decides the branch; a view is never assigned
`template: presenter` independent of that resolution.

## Field content stays in slots, unchanged

Choosing `presenter` for a form/wrapper/pager/exposed-filter surface does not move field-rendered
content out of slots: the field→slot mapping for read displays is unchanged. A presenter-template
renders the theme-methods-only chrome around fields; the fields themselves still render through
their formatter into slots.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| PTS-01 | error | A view whose `build_form` is a Display Builder form has no separate view-presenter — its wrapper, rows, pager, and exposed filter all resolve through the single Display Builder config owner | body |
| PTS-02 | error | Exactly one container owns the space beneath the view entity — the Display Builder config owner in that branch, or the presenter-template wrapper in the other; never both, never a second wrapper around either | body |
