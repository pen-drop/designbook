---
trigger:
  steps: [sync-to:intake, sync-to:transform]
filter:
  backend: wordpress
---

# Rule: Gutenberg Adapter Contract

The Gutenberg adapter is a thin editor over `ComponentRegistry`. It registers blocks from
registry definitions, writes `block.json` from those definitions, and renders through
`ComponentRegistry::render()`.

| ID | Constraint |
|---|---|
| GUT-01 | Block names are `{hyphen-namespace}/{hyphen-id}` from the active theme stylesheet slug and the definition id. Underscores become hyphens. A name collision is reported with both component ids and no metadata file is written. |
| GUT-02 | Each `ui()` definition is an insertable `apiVersion` 3 block. `ui: false` definitions that exported content needs are registered with `inserter: false`. Category is the definition `group` when set, otherwise `designbook`. |
| GUT-03 | Attribute types follow the definition `props` schema: `enum` select, `boolean` toggle, `format: uri` URL, `string` text, `number`/`integer` number, `object`/`array` JSON. `default` values including `false`, `0` and `""` are stored as given. An unsupported property type fails with `{component}.{property}` and leaves existing `block.json` files unchanged. |
| GUT-04 | A component block owns one InnerBlocks collection that contains exactly one structural slot block per declared slot. Slot wrappers keep their name and stay locked to the parent; their children stay editable. |
| GUT-05 | The adapter listener is attached to `designbook/register_components` before `init` priority 20 fires that action. The adapter reads definitions only through the registry. |
