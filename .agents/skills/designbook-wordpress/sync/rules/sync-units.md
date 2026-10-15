---
trigger:
  steps: [sync-to:intake]
filter:
  backend: wordpress
---

# Rule: WordPress Sync Units

"Sync to backend" generates code: a plugin `<ns>-content` (content model + component registry)
and the theme `<ns>` (presentation). `<ns>` is `component.namespace`. Every `path` is relative to `sync_target_dir`
(`wp-content`). One unit writes exactly one file. Theme files use names an existing theme does
not ship (`single-<bundle>.php` wins over `single.php` in the template hierarchy), so the
existence filter only skips files Designbook generated before — except `index.php`, which
WordPress requires to activate a theme and which an existing theme keeps.

| Unit name | Path | Emitted for |
|---|---|---|
| `plugin.<ns>_content` | `plugins/<ns>-content/<ns>-content.php` | always |
| `plugin.<ns>_content.composer` | `plugins/<ns>-content/composer.json` | always |
| `plugin.<ns>_content.registry` | `plugins/<ns>-content/src/ComponentRegistry.php` | always |
| `post_type.<bundle>` | `plugins/<ns>-content/post-types/<bundle>.php` | each custom `post` bundle (not `post`, `page`) |
| `taxonomy.<bundle>` | `plugins/<ns>-content/taxonomies/<bundle>.php` | each `term` bundle |
| `field_group.<et>_<bundle>` | `plugins/<ns>-content/fields/<et>-<bundle>.php` | each bundle with fields beyond its entity type's base fields |
| `theme.<ns>.base` | `themes/<ns>/views/designbook-base.twig` | always |
| `theme.<ns>.index` | `themes/<ns>/index.php` | always |
| `template.<bundle>.single` | `themes/<ns>/single-<bundle>.php` | each `post` bundle with a `full` view mode |
| `view.<bundle>.full` | `themes/<ns>/views/single-<bundle>.twig` | each `post` bundle with a `full` view mode |
| `parts.<ns>.header`, `parts.<ns>.footer` | `themes/<ns>/views/parts/header.twig`, `footer.twig` | when the design-system shell scene exists |

The content plugin's main file owns the runtime the generated theme files rely on: it boots
Timber, registers the Twig namespace `<ns>` → the theme's `components/` with autoescape off,
enqueues the theme's compiled `css/app.css`, and fires `designbook/register_components`.

Units carry `entity_type`, `bundle` and `def` where they derive from a bundle. Order: plugin →
post types → taxonomies → field groups → theme base → theme index → templates → views → parts.
