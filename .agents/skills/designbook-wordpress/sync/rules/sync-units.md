---
trigger:
  steps: [sync-to:intake]
filter:
  backend: wordpress
---

# Rule: WordPress Sync Units

"Sync to backend" generates code: a plugin `<ns>-content` (content model + component registry)
and the theme `<ns>` (presentation). `<ns>` is `component.namespace`; in a path the plugin
slug replaces `_` with `-` only where noted. Every `path` is relative to `sync_target_dir`
(`wp-content`). One unit writes exactly one file.

| Unit name | Path | Emitted for |
|---|---|---|
| `plugin.<ns>_content` | `plugins/<ns>-content/<ns>-content.php` | always |
| `plugin.<ns>_content.composer` | `plugins/<ns>-content/composer.json` | always |
| `plugin.<ns>_content.registry` | `plugins/<ns>-content/src/ComponentRegistry.php` | always |
| `post_type.<bundle>` | `plugins/<ns>-content/post-types/<bundle>.php` | each custom `post` bundle (not `post`, `page`) |
| `taxonomy.<bundle>` | `plugins/<ns>-content/taxonomies/<bundle>.php` | each `term` bundle |
| `field_group.<et>_<bundle>` | `plugins/<ns>-content/fields/<et>-<bundle>.php` | each bundle with fields beyond its entity type's base fields |
| `theme.<ns>.functions` | `themes/<ns>/functions.php` | always |
| `theme.<ns>.single` | `themes/<ns>/single.php` | always |
| `theme.<ns>.base` | `themes/<ns>/views/base.twig` | always |
| `view.<bundle>.full` | `themes/<ns>/views/single-<bundle>.twig` | each `post` bundle with a `full` view mode |
| `parts.<ns>.header`, `parts.<ns>.footer` | `themes/<ns>/views/parts/header.twig`, `footer.twig` | when the design-system shell scene exists |

Units carry `entity_type`, `bundle` and `def` where they derive from a bundle. Order: plugin →
post types → taxonomies → field groups → theme → views → parts.
