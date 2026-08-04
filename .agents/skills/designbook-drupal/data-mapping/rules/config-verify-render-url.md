---
trigger:
  domain: config-verify
filter:
  backend: drupal
---

# Rule: Drupal render URL + config fix for config-verify

Drupal is the first backend that plugs into the core `config-verify` workflow. Core stays
backend-neutral; everything Drupal-specific is a command string or config here — no backend
code is added to core.

## renderUrlCommand (candidate render URL)

The core `render_url` resolver runs the project's `renderUrlCommand`, substituting
`{config_id}` with the config-verify subject, and uses the printed URL as the backend render
(candidate) side. The command MUST print only the URL (the resolver trims stdout and fails
cleanly on empty output). The subject shape and capture mode depend on `config_type`.

### `config_type: entity_view_display`

`{config_id}` is the `entity_view_display` id (`<entity_type>.<bundle>.<view_mode>`). Set
`renderUrlCommand` to a drush command that prints a render URL for a representative entity of
that bundle. Template:

```
drush eval '$p = explode(".", "{config_id}"); [$type, $bundle, $viewMode] = $p; $ids = \Drupal::entityQuery($type)->accessCheck(FALSE)->condition(\Drupal::entityTypeManager()->getDefinition($type)->getKey("bundle"), $bundle)->range(0, 1)->execute(); $e = \Drupal::entityTypeManager()->getStorage($type)->load(reset($ids)); print $e->toUrl("canonical", ["absolute" => TRUE])->toString();'
```

- The canonical page renders the entity in its `full` view mode; for other view modes point
  the command at a route that renders that view mode.
- The backend-side isolation selector for the rendered entity (used by `capture-backend`) is
  the entity's rendered wrapper — e.g. `.node`, `article.node`, or the SDC/component root the
  view display renders into. Supply it as the config-verify element `selector`.

### `config_type: scene`

`{config_id}` is the Scene id. The command prints the **real, canonical URL of the page that
`sync-to` synced for that Scene** — the page itself, resolved by its deterministic content
identity (the same uuid `sync-to` minted from the Scene id). It is **not** a preview route and
**not** an isolated entity render. Template:

```
drush eval '$uuid = \Drupal::service("uuid")->…deterministic-from("{config_id}"); $e = \Drupal::service("entity.repository")->loadEntityByUuid("node", $uuid); print $e->toUrl("canonical", ["absolute" => TRUE])->toString();'
```

- **No isolation selector.** The candidate is captured **full-page** — leave the config-verify
  element `selector` empty so the whole page (shell, header, content, footer) is compared
  against the Scene's story, which renders the same whole page. The empty-selector full-page
  path already exists in capture.
- The synced page's URL is stable across re-syncs because its content uuid is deterministic,
  so the candidate URL is reproducible run to run.

## Config fix (polish-config)

The single `polish-config` fix pass edits the **entity view display** config, never the
Storybook component. Use drush config commands (command strings + config only):

```
drush config:get core.entity_view_display.<entity_type>.<bundle>.<view_mode>
drush config:set core.entity_view_display.<entity_type>.<bundle>.<view_mode> <key> <value> -y
drush config:export -y   # persist the change to the config sync directory
```

Typical fixes that move the score: change a field's `type` (formatter), its `settings`,
`label` visibility, `weight`/ordering under `content`, or move a field to `hidden`. After the
edit, the workflow re-captures and re-compares — do not re-render inside the fix pass.

For a `config_type: scene` subject the fixable surface is the whole synced page — its display
config **and** its content (the block_content instances or the page entity's field values /
layout). Edit those via drush config/content commands (command strings + config only). Never
touch the Storybook component: on the Scene path it is the reference the page is measured
against.
