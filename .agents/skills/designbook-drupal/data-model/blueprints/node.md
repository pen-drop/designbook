---
type: entity-type
name: node
priority: 10
trigger:
  domain: data-model
filter:
  backend: drupal
---

# Entity Type: node

```yaml
entity_type: node
section: content
base_fields:
  title:
    type: string
    required: true
  body:
    type: text_with_summary
    required: false
```

## Drupal Config Export

The `to_drupal` block below transforms a node bundle definition into `DrupalConfigEntity[]`
suitable for Drupal config/sync. Input shape:

```
{
  bundle: "<bundle-machine-name>",
  def: { fields: { <field_name>: { type: "<type>", ... } } }
}
```

Output: `[node.type.<bundle>, ...field.storage.node.<name>, ...field.field.node.<bundle>.<name>]`

### to_drupal

```jsonata
(
  /* ── node.type.<bundle> config entity ── */
  $nodeType := {
    "config_name": "node.type." & bundle,
    "data": {
      "langcode":     "en",
      "status":       true,
      "dependencies": {},
      "name":         bundle,
      "type":         bundle,
      "description":  def.purpose ? def.purpose : "",
      "help":         "",
      "new_revision": false,
      "preview_mode": 1,
      "display_submitted": true
    }
  };

  /* ── field configs for every entry in def.fields ── */
  $fieldNames := $keys(def.fields);
  $fieldConfigs := $fieldNames.(
    $name  := $;
    $field := $lookup($$.def.fields, $name);
    [
      $fieldToStorage('node', $name, $field),
      $fieldToInstance('node', $$.bundle, $name, $field)
    ]
  );

  /* ── combine: node type first, then all field configs ── */
  $append([$nodeType], $fieldConfigs)
)
```

`$fieldToStorage` and `$fieldToInstance` are assumed in scope via the `field-types.md`
prelude — do not redefine them here.
