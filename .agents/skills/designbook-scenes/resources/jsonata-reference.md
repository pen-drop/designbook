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
    "component": "figure",
    "props": {
      "src": field_media.url,
      "alt": field_media.alt ? field_media.alt : title
    }
  },
  {
    "component": "heading",
    "props": { "level": "h3" },
    "slots": { "text": title }
  },
  {
    "component": "text-block",
    "slots": {
      "content": field_teaser ? field_teaser : $substring(field_body, 0, 200) & "..."
    }
  }
]
```

### ComponentNode Output

Each item in the output array:

| Key | Required | Type | Description |
|-----|----------|------|-------------|
| `component` | ✅ | string | Component name (without provider prefix — added at render time) |
| `props` | ❌ | object | Data/configuration values passed to the component |
| `slots` | ❌ | object | Rendered content slots (strings, arrays, or nested nodes) |

### Nested Entity References

For cross-entity rendering, return an entity node. The addon resolves it recursively by loading the referenced `.jsonata` file:

| Key | Required | Type | Description |
|-----|----------|------|-------------|
| `type` | ✅ | `"entity"` | Marks this as a nested entity reference |
| `entity_type` | ✅ | string | Entity type (e.g. `"block_content"`) |
| `bundle` | ✅ | string | Bundle name (e.g. `"contact_person"`) |
| `view_mode` | ✅ | string | View mode to apply |
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
| Conditional node | Ternary in array | See below |

### Conditional Components

Use JSONata's ternary to conditionally include components. `null` values are automatically filtered from arrays:

```jsonata
[
  {
    "component": "heading",
    "props": { "level": "h1" },
    "slots": { "text": title }
  },
  field_media ? {
    "component": "figure",
    "props": {
      "src": field_media.url,
      "alt": field_media.alt
    }
  },
  {
    "component": "text-block",
    "slots": { "content": field_body }
  }
]
```

### Nested Entity Example

Embedding a contact card from another entity type:

```jsonata
[
  {
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
