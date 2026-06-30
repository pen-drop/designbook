---
type: entity-type
name: taxonomy_term
priority: 10
trigger:
  domain: data-model
filter:
  backend: drupal
---

# Entity Type: taxonomy_term

```yaml
entity_type: taxonomy_term
section: content
base_fields:
  name:
    type: string
    required: true
  description:
    type: text
    required: false
  weight:
    type: integer
    required: false
```

## Drupal Config Export

> **Generator pattern.** The JSONata below is the reference pattern for the generated transform.
> The concrete `.jsonata` is authored per config-name task against the prepare-fetched schema.

The `to_drupal` block below transforms a taxonomy bundle (vocabulary) definition into
config-name/data pairs suitable for Drupal config/sync. Input shape:

```
{
  bundle: "<vocabulary-machine-name>",
  def: { fields: { <field_name>: { type: "<type>", ... } } }
}
```

Output: `[taxonomy.vocabulary.<bundle>, ...field.storage.taxonomy_term.<name>, ...field.field.taxonomy_term.<bundle>.<name>]`

Note: the Drupal config object name for a taxonomy vocabulary is `taxonomy.vocabulary.<bundle>`,
not `taxonomy_term.type.<bundle>`. The entity type used for field config keys is `taxonomy_term`.

### to_drupal

```jsonata
(
  /* ── taxonomy.vocabulary.<bundle> config entity ── */
  $vocabulary := {
    "config_name": "taxonomy.vocabulary." & bundle,
    "data": {
      "langcode":    "en",
      "status":      true,
      "dependencies": {},
      "name":        bundle,
      "vid":         bundle,
      "description": def.purpose ? def.purpose : "",
      "hierarchy":   0,
      "weight":      0
    }
  };

  /* ── field configs for every entry in def.fields ── */
  $fieldNames := $keys(def.fields);
  $fieldConfigs := $fieldNames.(
    $name  := $;
    $field := $lookup($$.def.fields, $name);
    [
      $fieldToStorage('taxonomy_term', $name, $field),
      $fieldToInstance('taxonomy_term', $$.bundle, $name, $field)
    ]
  );

  /* ── combine: vocabulary first, then all field configs ── */
  $append([$vocabulary], $fieldConfigs)
)
```

`$fieldToStorage` and `$fieldToInstance` are assumed in scope via the `field-types.md`
prelude — do not redefine them here.
