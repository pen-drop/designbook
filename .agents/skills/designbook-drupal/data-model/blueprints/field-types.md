---
type: field-types
name: field-types
priority: 10
trigger:
  domain: data-model
filter:
  backend: drupal
extends:
  DataModel:
    properties:
      content:
        additionalProperties:
          additionalProperties:
            properties:
              fields:
                additionalProperties:
                  properties:
                    settings:
                      type: object
                      additionalProperties: true
suggests:
  field_type_enum:
    enum:
      - string
      - text
      - text_with_summary
      - formatted_text
      - integer
      - boolean
      - link
      - image
      - reference
    description: >
      Recognised Designbook field types for Drupal backend. Reference fields map to
      entity_reference in Drupal storage. Image fields require settings.image_style.
      Reference fields require settings.target_type.
  image_settings:
    type: object
    description: Required settings for image-type fields.
    required: [image_style]
    properties:
      image_style:
        type: string
        description: Machine name of the Drupal image style to apply (e.g. "thumbnail", "hero").
  reference_settings:
    type: object
    description: Required settings for reference-type fields.
    required: [target_type]
    properties:
      target_type:
        type: string
        description: Drupal entity type the field references (e.g. "user", "node", "media").
      handler:
        type: string
        description: Selection handler machine name (default "default").
---

# Blueprint: Field Types

Shared JSONata serialization layer for Drupal config export. Provides
`$fieldToStorage` and `$fieldToInstance` functions that transform one
Designbook field definition into a `DrupalConfigEntity[]` pair — one
`field.storage.*` record and one `field.field.*` record — satisfying the
`DrupalConfigEntity` contract from `designbook/sync/schemas.yml`.

## JSONata block naming convention

Named blocks are fenced ` ```jsonata ` code fences that appear immediately
after a level-3 heading (`### <block-name>`). Tests and other blueprints
load a block with `loadJsonata(blueprintRelPath, 'to_drupal')`.

## Field-type mapping

| Designbook type | Drupal storage type | Module dependency |
|---|---|---|
| `string` | `string` | `text` |
| `text` | `text_long` | `text` |
| `text_with_summary` | `text_with_summary` | `text` |
| `formatted_text` | `text_long` | `text` |
| `integer` | `integer` | `core` |
| `boolean` | `boolean` | `core` |
| `link` | `link` | `link` |
| `image` | `image` | `image` |
| `reference` | `entity_reference` | `core` |

## Special cases

- **image**: `settings.image_style` is required. The storage type is `image`; the
  `image` module must be listed as a dependency.
- **reference**: `settings.target_type` is required (Drupal entity type). The storage
  type is `entity_reference`. Optionally `settings.handler` overrides the selection
  handler (default `"default"`).

### to_drupal

```jsonata
(
  /* ── module dependency lookup ── */
  $moduleFor := function($t) {(
    $t = 'string'            ? 'text'  :
    $t = 'text'              ? 'text'  :
    $t = 'text_with_summary' ? 'text'  :
    $t = 'formatted_text'    ? 'text'  :
    $t = 'integer'           ? 'core'  :
    $t = 'boolean'           ? 'core'  :
    $t = 'link'              ? 'link'  :
    $t = 'image'             ? 'image' :
    $t = 'reference'         ? 'core'  :
    'core'
  )};

  /* ── Drupal storage type lookup ── */
  $drupalType := function($t) {(
    $t = 'string'            ? 'string'           :
    $t = 'text'              ? 'text_long'         :
    $t = 'text_with_summary' ? 'text_with_summary' :
    $t = 'formatted_text'    ? 'text_long'         :
    $t = 'integer'           ? 'integer'           :
    $t = 'boolean'           ? 'boolean'           :
    $t = 'link'              ? 'link'              :
    $t = 'image'             ? 'image'             :
    $t = 'reference'         ? 'entity_reference'  :
    $t
  )};

  /* ── build field.storage.<et>.<name> ── */
  $fieldToStorage := function($et, $name, $field) {(
    $ft      := $field.type;
    $dt      := $drupalType($ft);
    $mod     := $moduleFor($ft);
    $deps    := $mod = 'core' ? {} : {"module": [$mod]};
    {
      "config_name": "field.storage." & $et & "." & $name,
      "data": $merge([
        {
          "langcode":     "en",
          "status":       true,
          "dependencies": $deps,
          "id":           $et & "." & $name,
          "field_name":   $name,
          "entity_type":  $et,
          "type":         $dt,
          "settings":     $ft = 'reference'
                            ? {"target_type": $field.settings.target_type}
                            : {},
          "module":       $mod,
          "locked":       false,
          "cardinality":  $field.multiple = true ? -1 : 1,
          "translatable": true,
          "indexes":      {}
        }
      ])
    }
  )};

  /* ── build field.field.<et>.<bundle>.<name> ── */
  $fieldToInstance := function($et, $bundle, $name, $field) {(
    $ft      := $field.type;
    $mod     := $moduleFor($ft);
    $deps    := $merge([
      $mod = 'core' ? {} : {"module": [$mod]},
      {"config": ["field.storage." & $et & "." & $name]}
    ]);
    {
      "config_name": "field.field." & $et & "." & $bundle & "." & $name,
      "data": $merge([
        {
          "langcode":      "en",
          "status":        true,
          "dependencies":  $deps,
          "id":            $et & "." & $bundle & "." & $name,
          "field_name":    $name,
          "entity_type":   $et,
          "bundle":        $bundle,
          "label":         $field.title ? $field.title : $name,
          "description":   $field.description ? $field.description : "",
          "required":      $field.required = true,
          "translatable":  true,
          "default_value": [],
          "settings":      $ft = 'image'
                             ? {"image_style": $field.settings.image_style}
                             : $ft = 'reference'
                             ? {
                                 "handler": $field.settings.handler
                                              ? $field.settings.handler
                                              : "default",
                                 "handler_settings": {
                                   "target_bundles": null
                                 }
                               }
                             : {}
        }
      ])
    }
  )};

  /* ── entry point: return [storage, instance] for the input ── */
  [
    $fieldToStorage(et, name, field),
    $fieldToInstance(et, bundle, name, field)
  ]
)
```
