---
trigger:
  domain: sync-verify
filter:
  backend: drupal
---

# Rule: Drupal render URL + backend fix for sync-verify

Drupal is the first backend that plugs into the core `sync-verify` workflow. Core stays
backend-neutral; everything Drupal-specific is a command string or config here — no backend
code is added to core.

## renderUrlCommand (candidate render URL)

The core `render_url` resolver runs the project's `renderUrlCommand`, substituting
`{config_id}` with the sync-verify subject (the `story`), and uses the printed URL as the
backend render (candidate) side. The command MUST print only the URL (the resolver trims
stdout and fails cleanly on empty output). Which of the three candidate renders below
applies is selected by `kind` (and, within `config`, by whether a `selector` is present).

### `kind: config` — config-entity (selector present)

`{config_id}` is the `entity_view_display` id (`<entity_type>.<bundle>.<view_mode>`). Set
`renderUrlCommand` to a drush command that prints the **canonical page** URL of a
representative entity of that bundle. Template:

```
drush eval '$p = explode(".", "{config_id}"); [$type, $bundle, $viewMode] = $p; $ids = \Drupal::entityQuery($type)->accessCheck(FALSE)->condition(\Drupal::entityTypeManager()->getDefinition($type)->getKey("bundle"), $bundle)->range(0, 1)->execute(); $e = \Drupal::entityTypeManager()->getStorage($type)->load(reset($ids)); print $e->toUrl("canonical", ["absolute" => TRUE])->toString();'
```

- The canonical page renders the entity in its `full` view mode; for other view modes point
  the command at a route that renders that view mode.
- The backend-side isolation `selector` for the rendered entity (used by `capture-backend`)
  is the entity's rendered wrapper — e.g. `.node`, `article.node`, or the SDC/component root
  the view display renders into. Supply it as the sync-verify element `selector`; its
  presence is what selects this config-entity sub-mode.

### `kind: config` — entity-view-mapping (selector empty)

`{config_id}` is the `entity_view_display` id. The candidate is the **designbook module's
preview route**, which renders the single entity in the view mode in isolation:
`/designbook/preview/{entity_type}/{entity}/{view_mode}` (`PreviewController`). Template:

```
drush eval '$p = explode(".", "{config_id}"); [$type, $bundle, $viewMode] = $p; $ids = \Drupal::entityQuery($type)->accessCheck(FALSE)->condition(\Drupal::entityTypeManager()->getDefinition($type)->getKey("bundle"), $bundle)->range(0, 1)->execute(); print \Drupal\Core\Url::fromUri("base:/designbook/preview/" . $type . "/" . reset($ids) . "/" . $viewMode, ["absolute" => TRUE])->toString();'
```

- The preview route is already isolated, so **leave the sync-verify element `selector`
  empty** — its emptiness is what selects this entity-view-mapping sub-mode.

### `kind: scene` — real synced page (full-page)

`{config_id}` is the Scene id. The command prints the **real, canonical URL of the page that
`sync-to` synced for that Scene** — the page itself, resolved from its **config-derived
identity**, never a content uuid (a Scene sync creates no content). It is **not** a preview
route and **not** an isolated entity render. Two forms, selected by the page's build form:

- **Layout Builder** — the page's layout config lives on the full view display of the page
  bundle; the reachable page is the **canonical URL of a canonical entity of that bundle**
  (the fixture provides exactly one as a bare-entity test seed). Resolve it by bundle, not by
  uuid. Template:

  ```
  drush eval '$ids = \Drupal::entityQuery("node")->accessCheck(FALSE)->condition("type", "<bundle>")->range(0, 1)->execute(); print \Drupal::entityTypeManager()->getStorage("node")->load(reset($ids))->toUrl("canonical", ["absolute" => TRUE])->toString();'
  ```

- **Display Builder** — the Scene synced a `page_layout` config entity with its own route;
  the command prints that config route's absolute URL.

- **No isolation selector.** The candidate is captured **full-page** — leave the sync-verify
  element `selector` empty so the whole page (shell, header, content, footer) is compared
  against the Scene's story, which renders the same whole page. The empty-selector full-page
  path already exists in capture.
- The URL is stable across re-syncs because the config identity (bundle / `page_layout` route)
  is fixed, so the candidate URL is reproducible run to run.

## Backend fix (polish-config)

The single `polish-config` fix pass edits the **backend surface**, never the Storybook
component. Use drush config/content commands (command strings + config only).

For a `config`-kind subject the fixable surface is the **entity view display** config:

```
drush config:get core.entity_view_display.<entity_type>.<bundle>.<view_mode>
drush config:set core.entity_view_display.<entity_type>.<bundle>.<view_mode> <key> <value> -y
drush config:export -y   # persist the change to the config sync directory
```

Typical fixes that move the score: change a field's `type` (formatter), its `settings`,
`label` visibility, `weight`/ordering under `content`, or move a field to `hidden`. After the
edit, the workflow re-captures and re-compares — do not re-render inside the fix pass.

For a `scene`-kind subject the fixable surface is the synced page's **config only** — the
Layout-Builder display/layout config (`core.entity_view_display.<et>.<bundle>.<full>` with its
`layout_builder.sections`) or the Display-Builder `page_layout` config. The visible content
lives inline in that config, so there is no content entity to edit. Edit it via the same drush
`config:get`/`config:set`/`config:export` commands (command strings + config only). Never touch
the Storybook component: on the scene path it is the reference the page is measured against.
