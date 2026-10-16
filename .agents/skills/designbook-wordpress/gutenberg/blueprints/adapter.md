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

`render_callback` walks each component's slot wrappers, renders every descendant once, and
passes the slot HTML strings to `ComponentRegistry::render()`. Slot wrappers emit no
frontend markup. Frontend exceptions log and return an empty string; preview returns a
structured REST error.

Authenticated `POST /designbook/v1/gutenberg-preview` accepts `post_id` plus serialized
block markup and returns `{ html }`. `edit_post` is required for a post; template previews
require `edit_theme_options`. Trees larger than 1 MiB or deeper than 50 levels, unknown
or duplicate slots, unknown blocks, invalid types and unsafe URIs return HTTP 400 without
stack traces.

The editor script uses `wp.element` / `wp.blockEditor` / `wp.components` with no build step.
Scalar props map to TextControl, ToggleControl, SelectControl and number inputs. Object and
array props use a labelled JSON textarea that reports parse errors beside the field.
`wp_localize_script` passes the same manifest PHP used to write `block.json`. Edit mode
shows inspector controls and InnerBlocks; Preview mode POSTs the live subtree and renders
the returned HTML, dropping stale responses.
