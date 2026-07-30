---
trigger:
  domain: data-model
filter:
  backend: drupal
---

# Rule: Form Modes

A bundle's `form_modes` are the **editing** half of the bundle, symmetric to `view_modes` (the reading
half). Each form mode maps to a Drupal `core.entity_form_display.<et>.<bundle>.<form_mode>`, reached over
an edit route. `default` is the form mode every bundle always has.

## `label` required for non-default form modes

`label` is required on every **non-default** form mode. `sync-to` emits a
`core.entity_form_mode.<et>.<form_mode>` definition for each non-default mode, and that definition carries
the human-readable name from `label` — with no `label` there is nothing to name it. The `default` form
mode is built in and needs no `label`. This mirrors the same requirement on non-standard `view_modes`.

## Edit routes

Form displays render over an edit route, not as a placed block:

- `/node/add/{type}` and `/node/{node}/edit` — the node add/edit form
- `/user/{user}/edit` — the user edit form
- `/user/register` — the user `register` form mode
- `comment/reply/{entity_type}/{entity}/{field_name}` — the comment reply form

## Comment form

The comment form belongs here, not with placed blocks. A `comment` field in the host bundle's
`core.entity_view_display.*` renders the reply form through
`core.entity_form_display.comment.<bundle>.default`. Drupal core ships no comment-form block plugin, and
none is needed — model the comment form as a `form_modes` entry on the `comment` bundle.

## Not a goal — field selection and widgets

Scope is **which component renders the form**. The full `core.entity_form_display` field semantics — which
fields appear, in what order, and each field's widget configuration — are out of scope. Do not add a
`widgets:` or field-selection member to a form mode; a form mode carries only `template`, `label`, and
`settings`, the same shape as a view mode.

## Multiple form modes are core reality

More than one form mode per bundle is normal, not an edge case. Drupal core ships
`core/modules/user/config/install/core.entity_form_mode.user.register.yml` (the `register` mode on the
`user` bundle) and `core/modules/media_library/config/install/core.entity_form_mode.media.media_library.yml`
as stock non-default form modes.
