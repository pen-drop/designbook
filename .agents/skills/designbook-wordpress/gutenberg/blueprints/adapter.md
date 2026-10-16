---
type: data-mapping
name: gutenberg-adapter
trigger:
  domain: data-mapping
  config_name: 'gutenberg.*'
filter:
  backend: wordpress
---

# Blueprint: Gutenberg Adapter Runtime

`gutenberg.adapter` — `plugins/<ns>-content/gutenberg/GutenbergAdapter.php`, copied unchanged
from `designbook-wordpress/gutenberg/templates/GutenbergAdapter.php`.

`gutenberg.editor` — `plugins/<ns>-content/gutenberg/editor.js`, copied unchanged from
`designbook-wordpress/gutenberg/templates/editor.js`.

`GutenbergAdapter::register(ComponentRegistry $registry)` walks `$registry->all()`, writes
`gutenberg/blocks/<id>/block.json` after every name and schema is valid, then calls
`register_block_type()` with shared handle `designbook-gutenberg-editor`. A shared
`<hyphen-ns>/slot` block stores the slot `name` and `title`.

The editor script uses `wp.element` / `wp.blockEditor` / `wp.components` with no build step.
Scalar props map to TextControl, ToggleControl, SelectControl and number inputs. Object and
array props use a labelled JSON textarea that reports parse errors beside the field.
`wp_localize_script` passes the same manifest PHP used to write `block.json`.
