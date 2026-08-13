---
type: data-mapping
name: presenter-template
priority: 10
trigger:
  domain: data-mapping
filter:
  backend: drupal
---

# Blueprint: Presenter-Template (Twig)

Starting point for the Twig theme template `sync-to` writes for a `template: presenter` surface —
a form, pager, or exposed filter whose presentation Drupal produces only through theme markup, not
through UI-Patterns display config. The display config still binds the surface to its SDC (authored
by the matching display-unit pattern); this blueprint is the theme-markup *how* that config points
at. A UI-Patterns-bindable surface (`template: field-map`) needs no presenter-template.

## Where the file lands

The presenter-template is a Twig file in the active theme's templates directory, generated
alongside the surface's display config (not in the config-sync directory). Follow the theme's
normal template layout — group by surface **type** under `templates/<type>/`, not under a
`presenter/` folder: e.g. `templates/forms/<name>.html.twig` for an edit form,
`templates/views/<name>.html.twig` for a view template, `templates/pager/<name>.html.twig` for a
pager. The `<name>` follows Drupal's theme-hook suggestion for that surface.

## Fields render through their formatter; chrome is the Twig's job

A presenter-template renders the theme-methods-only chrome — the form element ordering and markup,
the pager, the exposed-filter form — and lets each field render through its own formatter output.
Field-rendered content (rich text, body, a single `title` or `link`/CTA) is emitted as its
rendered field markup, the same content that a read display places in a slot; the Twig never
re-stringifies a raw storage value into an escaped scalar. Control and attribute values (a variant
key, an icon id, a link `url` fed to an attribute) may be read directly.

## Per-surface guidance

- **Edit form (`form_mode`).** Render the form's render array through the theme layer, ordering
  and grouping the widgets as the design reference shows. The form display config stays minimal
  (its binding identity); the arrangement lives in this Twig.
- **Pager.** Render the pager markup (previous/next, page items) for the view's result set.
- **Exposed filter.** Render the exposed-filter form controls (the filter inputs and submit) as
  the reference shows them.

## Reference shape (illustrative)

```twig
{# templates/form/node-article-edit.html.twig — a form theme-hook template renders the form's
   children; the <form> element and its attributes come from the render element. Arrange the
   fields you place, then emit `form|without(...)` so the form's other children — the actions and
   the hidden CSRF / form_build_id / form_id inputs — are still output and the form submits. #}
<div class="presenter-form__body">
  {{ form.field_title }}
  {{ form.field_body }}
</div>
{{ form|without('field_title', 'field_body') }}
```

Never cherry-pick only the visible fields: dropping `form|without(...)` (or `{{ children }}`) drops
the hidden inputs and actions, and the form no longer submits. The concrete field names come from
the surface's render array at generation time; treat the arrangement here as a starting point a
theme may replace wholesale.
