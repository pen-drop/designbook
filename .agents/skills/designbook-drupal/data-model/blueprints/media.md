---
type: entity-type
name: media
priority: 10
trigger:
  domain: data-model
filter:
  backend: drupal
suggests:
  source:
    type: string
    default: "image"
    description: >
      Drupal media source plugin ID for the bundle (e.g. "image", "file", "video_file",
      "oembed:video"). Defaults to "image" — override in project-specific configuration.
---

# Entity Type: media

```yaml
entity_type: media
section: content
base_fields:
  name:
    type: string
    required: true
```

## Drupal Config Export

The `to_drupal` block below transforms a media bundle definition into `DrupalConfigEntity[]`
suitable for Drupal config/sync. Input shape:

```
{
  bundle: "<bundle-machine-name>",
  def: { fields: { <field_name>: { type: "<type>", ... } } }
}
```

Output: `[media.type.<bundle>, ...field.storage.media.<name>, ...field.field.media.<bundle>.<name>]`

The `source` plugin defaults to `"image"` — override per bundle in project configuration.

### to_drupal

```jsonata
(
  /* ── media.type.<bundle> config entity ── */
  $mediaType := {
    "config_name": "media.type." & bundle,
    "data": {
      "langcode":     "en",
      "status":       true,
      "dependencies": { "module": ["media"] },
      "name":         bundle,
      "id":           bundle,
      "description":  def.purpose ? def.purpose : "",
      "source":       def.source ? def.source : "image",
      "source_configuration": {},
      "field_map":    {}
    }
  };

  /* ── field configs for every entry in def.fields ── */
  $fieldNames := $keys(def.fields);
  $fieldConfigs := $fieldNames.(
    $name  := $;
    $field := $lookup($$.def.fields, $name);
    [
      $fieldToStorage('media', $name, $field),
      $fieldToInstance('media', $$.bundle, $name, $field)
    ]
  );

  /* ── combine: media type first, then all field configs ── */
  $append([$mediaType], $fieldConfigs)
)
```

`$fieldToStorage` and `$fieldToInstance` are assumed in scope via the `field-types.md`
prelude — do not redefine them here.
