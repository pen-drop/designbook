---
trigger:
  steps: [sync-to:intake, sync-to:transform]
filter:
  backend: wordpress
---

# Rule: Gutenberg Adapter Contract

The Gutenberg adapter is a thin editor over `ComponentRegistry`. It registers blocks from
registry definitions and renders through
`ComponentRegistry::render()`.

| ID | Constraint |
|---|---|
| GUT-01 | Block names are `{hyphen-namespace}/{hyphen-id}` from the active theme stylesheet slug and the definition id. Underscores become hyphens. A name collision is reported with both component ids and registration stops without a fatal. |
| GUT-02 | Each `ui()` definition is an insertable `apiVersion` 3 block. `ui: false` definitions that exported content needs are registered with `inserter: false`. Category is the definition `group` when set, otherwise `designbook`. |
| GUT-03 | Attribute types follow the definition `props` schema: `enum` select, `boolean` toggle, `format: uri` URL, `string` text, `number`/`integer` number, `object`/`array` JSON. `default` values including `false`, `0` and `""` are stored as given. An unsupported property type is reported as `{component}.{property}`. |
| GUT-04 | A component block owns one InnerBlocks collection that contains exactly one structural slot block per declared slot. Slot wrappers keep their name and stay locked to the parent; their children stay editable. |
| GUT-05 | The adapter listener is attached to `designbook/register_components` before `init` priority 20 fires that action. The adapter reads definitions only through the registry. |
| GUT-06 | Frontend and preview share one validated render path. Preview is an authenticated REST POST of the serialized subtree. The server enforces size, depth, slot identity, an allow-list of blocks, prop types and URI protocols at every depth. Failures return structured errors without stack traces and leave stored content unchanged. |
| GUT-07 | A component with variants declares `variant` as a prop in its `<name>.schema.yml`: `type: string`, an `enum` of the variant ids and a `default`. The adapter renders it as a select. Stories still select the variant through the top-level `variant` field (VARIANT-02); VARIANT-01 targets `.component.yml` and does not apply to Twig components, which have none. |
| GUT-08 | A repeated list (items, channels, navigation entries) is modelled as a slot that holds child components, not as an `array` prop, because `array` and `object` props are edited as raw JSON. A child component that editors add themselves keeps the default `ui: true`: a `ui: false` definition is registered with `inserter: false` and cannot be added from the inserter. |
| GUT-09 | A slot accepts every component block of the registry plus `core/paragraph`, `core/heading`, `core/image`, `core/list` and `core/list-item`; any other block fails preview and seed validation. Core blocks render with WordPress default markup, so the component's utility classes do not apply to them. A headline that editors should be able to set to another level belongs in a slot as `core/heading`; a headline as a string prop is a plain text field. |
| GUT-10 | Props are edited only in the inspector panel of the block; there is no inline editing. Controls follow the order of `props.properties` and use `title`, `enum`, `format` and `default`. `description` of props and slots is not used. `required` is checked by preview and seed validation, not enforced in the editor UI. |
