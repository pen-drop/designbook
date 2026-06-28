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
  /* ── shared helpers (inlined from field-types blueprint) ── */

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

  $fieldToStorage := function($et, $name, $field) {(
    $ft   := $field.type;
    $dt   := $drupalType($ft);
    $mod  := $moduleFor($ft);
    $deps := $mod = 'core' ? {} : {"module": [$mod]};
    {
      "config_name": "field.storage." & $et & "." & $name,
      "data": {
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
    }
  )};

  $fieldToInstance := function($et, $bundle, $name, $field) {(
    $ft   := $field.type;
    $mod  := $moduleFor($ft);
    $deps := $merge([
      $mod = 'core' ? {} : {"module": [$mod]},
      {"config": ["field.storage." & $et & "." & $name]}
    ]);
    {
      "config_name": "field.field." & $et & "." & $bundle & "." & $name,
      "data": {
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
    }
  )};

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
