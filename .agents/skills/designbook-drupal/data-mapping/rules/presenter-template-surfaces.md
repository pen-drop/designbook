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
display config — is a presenter-template surface and uses `template: presenter`:

- an **edit form** (a `form_mode` display reached over an edit route) — Drupal renders forms
  through the form builder and theme layer, not through UI-Patterns display config;
- a view **pager**;
- a view **exposed filter** form.

A mode that is a presenter surface carries `template: presenter`; `sync-to` then generates its
presenter-template (the Twig *how* is the presenter-template blueprint) alongside the display
config that binds it.

## Field content stays in slots, unchanged

Choosing `presenter` for a form/pager/exposed-filter surface does not move field-rendered content
out of slots: the field→slot mapping for read displays is unchanged. A presenter-template renders
the theme-methods-only chrome around fields; the fields themselves still render through their
formatter into slots.
