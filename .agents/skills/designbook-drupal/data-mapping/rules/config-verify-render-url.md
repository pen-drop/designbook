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
`{config_id}` with the `entity_view_display` id (`<entity_type>.<bundle>.<view_mode>`), and
uses the printed URL as the backend render (candidate) side. Set `renderUrlCommand` in the
designbook config to a drush command that prints a render URL for a representative entity of
that bundle. Template:

```
drush eval '$p = explode(".", "{config_id}"); [$type, $bundle, $viewMode] = $p; $ids = \Drupal::entityQuery($type)->accessCheck(FALSE)->condition(\Drupal::entityTypeManager()->getDefinition($type)->getKey("bundle"), $bundle)->range(0, 1)->execute(); $e = \Drupal::entityTypeManager()->getStorage($type)->load(reset($ids)); print $e->toUrl("canonical", ["absolute" => TRUE])->toString();'
```

- The canonical page renders the entity in its `full` view mode; for other view modes point
  the command at a route or preview that renders that view mode.
- The command MUST print only the URL (the resolver trims stdout and fails cleanly on empty
  output).
- The backend-side isolation selector for the rendered entity (used by `capture-backend`) is
  the entity's rendered wrapper — e.g. `.node`, `article.node`, or the SDC/component root the
  view display renders into. Supply it as the config-verify element `selector`.

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
