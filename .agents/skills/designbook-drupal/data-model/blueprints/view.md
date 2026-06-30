---
type: entity-type
name: view
priority: 10
trigger:
  domain: data-model
filter:
  backend: drupal
---

# Entity Type: view

```yaml
entity_type: view
section: config
base_fields:
  rows:
    type: view_rows
    required: true
  items_per_page:
    type: integer
    required: false
  header:
    type: text
    required: false
  footer:
    type: text
    required: false
  empty:
    type: text
    required: false
view_modes:
  required: true
```

## Drupal Config Export

> **Generator pattern.** The JSONata below is the reference pattern for the generated transform.
> The concrete `.jsonata` is authored per config-name task against the prepare-fetched schema.

The `to_drupal` block transforms a `config.view.<key>` definition into config-name/data pairs
suitable for Drupal config/sync. Input shape:

```
{
  key: "<view-machine-name>",
  def: { items_per_page?: <number>, view_modes?: [<string>], ... }
}
```

Output: `[views.view.<key>]`

### to_drupal

```jsonata
(
  /* ── views.view.<key> config entity ── */
  $itemsPerPage := def.items_per_page ? def.items_per_page : 10;

  /* Build a default display with pager settings */
  $defaultDisplay := {
    "default": {
      "id": "default",
      "display_title": "Default",
      "display_plugin": "default",
      "position": 0,
      "display_options": {
        "pager": {
          "type": "some",
          "options": {
            "items_per_page": $itemsPerPage,
            "offset": 0
          }
        },
        "use_more": false,
        "use_more_always": false,
        "use_more_text": "more",
        "link_display": "",
        "exposed_block": false,
        "filters": {},
        "sorts": {},
        "row": {
          "type": "entity:node",
          "options": {}
        },
        "fields": {},
        "access": {
          "type": "none",
          "options": {}
        },
        "cache": {
          "type": "tag",
          "options": {}
        }
      },
      "cache_metadata": {
        "max-age": -1,
        "contexts": ["languages:language_interface", "url.query_args", "user.permissions"],
        "tags": []
      }
    }
  };

  [{
    "config_name": "views.view." & key,
    "data": {
      "langcode":     "en",
      "status":       true,
      "dependencies": {
        "module": ["views"]
      },
      "id":          key,
      "label":       key,
      "module":      "views",
      "description": "",
      "tag":         "",
      "base_table":  "node_field_data",
      "base_field":  "nid",
      "display":     $defaultDisplay
    }
  }]
)
```

## Rules

- `rows` is generated at sample data time from context (entity_type, bundle, view_mode of the targeted content) — do NOT manually declare row values in the data model
- Every view bundle MUST declare at least one `view_modes` entry
- `view` lives under `config:` in data-model.yml — NOT under `content:`
