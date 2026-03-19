# JSONata Reference

## Expression Format

Each `.jsonata` file is a pure JSONata expression. Input is a single entity record from `data.yml`. Output is `ComponentNode[]`.

```jsonata
/* entity-mapping/node.article.teaser.jsonata
 * Input: single record from data.yml → node.article[n]
 * Output: ComponentNode[]
 */
[
  {
    "type": "component",
    "component": "figure",
    "props": {
      "src": field_media.url,
      "alt": field_media.alt ? field_media.alt : title
    }
  },
  {
    "type": "component",
    "component": "heading",
    "props": { "level": "h3" },
    "slots": { "text": title }
  },
  {
    "type": "component",
    "component": "text-block",
    "slots": {
      "content": field_teaser ? field_teaser : $substring(field_body, 0, 200) & "..."
    }
  }
]
```

### ComponentNode Structure

Each item in the output array MUST follow this structure:

| Key | Required | Type | Description |
|-----|----------|------|-------------|
| `type` | ✅ | `"component"` or `"entity"` | Node type |
| `component` | ✅ (for type=component) | string | Component name (without provider prefix — added at render time) |
| `props` | ❌ | object | Data/configuration values passed to the component |
| `slots` | ❌ | object | Rendered content slots (strings, arrays, or nested nodes) |
| `entity_type` | ✅ (for type=entity) | string | Entity type for nested entity references |
| `bundle` | ✅ (for type=entity) | string | Bundle name |
| `view_mode` | ✅ (for type=entity) | string | View mode to apply |
| `record` | ❌ | integer | Record index in sample data (default: 0) |

### JSONata Syntax Quick Reference

| Pattern | JSONata Syntax | Example |
|---------|---------------|---------|
| Field access | `field_name` | `title` → `"My Article"` |
| Nested field | `field_name.property` | `field_media.url` → `"/img.jpg"` |
| Fallback | `a ? a : b` | `field_teaser ? field_teaser : field_body` |
| String concat | `a & b` | `"/files/" & field_file.filename` |
| Substring | `$substring(str, start, len)` | `$substring(field_body, 0, 200) & "..."` |
| Uppercase | `$uppercase(str)` | `$uppercase(field_category.name)` |
| Array access | `arr[index]` | `field_tags[0].name` |
| Static value | `"literal"` or `123` | `"h1"`, `true`, `42` |
| Conditional node | Ternary in array | See "Conditional Components" below |

### Conditional Components

Use JSONata's ternary to conditionally include components:

```jsonata
[
  {
    "type": "component",
    "component": "heading",
    "props": { "level": "h1" },
    "slots": { "text": title }
  },
  field_media ? {
    "type": "component",
    "component": "figure",
    "props": {
      "src": field_media.url,
      "alt": field_media.alt
    }
  },
  {
    "type": "component",
    "component": "text-block",
    "slots": { "content": field_body }
  }
]
```

> JSONata filters `null` from arrays — conditional items that evaluate to `null` are automatically excluded.

### Nested Entity References

For cross-entity rendering (e.g., embedding a contact card from `block_content`):

```jsonata
[
  {
    "type": "component",
    "component": "heading",
    "props": { "level": "h1" },
    "slots": { "text": title }
  },
  {
    "type": "entity",
    "entity_type": "block_content",
    "bundle": "contact_person",
    "view_mode": "avatar",
    "record": 0
  }
]
```

The addon resolves `type: entity` nodes recursively by loading and evaluating the referenced `.jsonata` file. Recursion depth is limited to 5 levels.

### Composition-aware patterns

The `composition` field in `data-model.yml` determines what a view mode expression should output:

**`structured` bundles** (default): All view modes map fields to components. May include `type: "entity"` for reference fields.

**`unstructured` bundles**: Only `full` view mode is affected — it outputs the layout/component tree based on the project's `extensions` config:
- `layout_builder`: Output `section` components with entity refs in column slots
- `canvas` / `experience_builder`: Output components directly

All non-full view modes (teaser, card, etc.) are always structured regardless of bundle composition.

```jsonata
/* Unstructured + layout_builder: node.landing_page.full.jsonata */
[
  { "type": "component",
    "component": "section",
    "props": { "max_width": "lg", "columns": 2 },
    "slots": {
      "column_1": [
        { "type": "entity", "entity_type": "block_content",
          "bundle": "hero", "view_mode": "full", "record": 0 }
      ],
      "column_2": [
        { "type": "entity", "entity_type": "block_content",
          "bundle": "card", "view_mode": "full", "record": 0 }
      ]
    }
  }
]
```
