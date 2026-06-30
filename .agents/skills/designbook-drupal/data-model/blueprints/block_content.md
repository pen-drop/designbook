---
type: entity-type
name: block_content
priority: 10
trigger:
  domain: data-model
filter:
  backend: drupal
  extensions: layout_builder
---

# Entity Type: block_content

```yaml
entity_type: block_content
section: content
base_fields:
  info:
    type: string
    required: true
  status:
    type: boolean
    required: true
```

## Drupal Config Export

> **Generator pattern.** The JSONata below is the reference pattern for the generated transform.
> The concrete `.jsonata` is authored per config-name task against the prepare-fetched schema.

The `to_drupal` block below transforms a block_content bundle definition into
config-name/data pairs suitable for Drupal config/sync. Input shape:

```
{
  bundle: "<bundle-machine-name>",
  def: { fields: { <field_name>: { type: "<type>", ... } } }
}
```

Output: `[block_content.type.<bundle>, ...field.storage.block_content.<name>, ...field.field.block_content.<bundle>.<name>]`

### to_drupal

```jsonata
(
  /* ── block_content.type.<bundle> config entity ── */
  $blockType := {
    "config_name": "block_content.type." & bundle,
    "data": {
      "langcode":     "en",
      "status":       true,
      "dependencies": {},
      "id":           bundle,
      "label":        bundle,
      "revision":     false,
      "description":  def.purpose ? def.purpose : ""
    }
  };

  /* ── field configs for every entry in def.fields ── */
  $fieldNames := $keys(def.fields);
  $fieldConfigs := $fieldNames.(
    $name  := $;
    $field := $lookup($$.def.fields, $name);
    [
      $fieldToStorage('block_content', $name, $field),
      $fieldToInstance('block_content', $$.bundle, $name, $field)
    ]
  );

  /* ── combine: block_content type first, then all field configs ── */
  $append([$blockType], $fieldConfigs)
)
```

`$fieldToStorage` and `$fieldToInstance` are assumed in scope via the `field-types.md`
prelude — do not redefine them here.
