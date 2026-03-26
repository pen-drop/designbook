# JSONata Reference

## Expression Format

Each `.jsonata` file is a pure JSONata expression. Input is a single entity record from `data.yml`. Output is `SceneNode[]`.

```jsonata
/* entity-mapping/[entity_type].[bundle].teaser.jsonata
 * Input: single record from data.yml → [entity_type].[bundle][n]
 * Output: SceneNode[]
 */
[
  {
    "component": "figure",
    "props": {
      "src": image.url,
      "alt": image.alt ? image.alt : title
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
      "content": teaser ? teaser : $substring(body, 0, 200) & "..."
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

| Key           | Required | Type                   | Description |
|---------------|----------|------------------------|-------------|
| `entity`      | ✅ | `"entity_type.bundle"` | Marks this as a nested entity reference |
| `view_mode`   | ✅ | string                 | View mode to apply |
| `record`      | ❌ | integer                | Record index in sample data (default: 0) |

### JSONata Syntax Quick Reference

| Pattern | JSONata Syntax | Example |
|---------|---------------|---------|
| Field access | `field_name` | `title` → `"My Article"` |
| Nested field | `field_name.property` | `image.url` → `"/img.jpg"` |
| Fallback | `a ? a : b` | `teaser ? teaser : body` |
| String concat | `a & b` | `"/files/" & file.filename` |
| Substring | `$substring(str, start, len)` | `$substring(body, 0, 200) & "..."` |
| Uppercase | `$uppercase(str)` | `$uppercase(category.name)` |
| Array access | `arr[index]` | `tags[0].name` |
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
  image ? {
    "component": "figure",
    "props": {
      "src": image.url,
      "alt": image.alt
    }
  },
  {
    "component": "text-block",
    "slots": { "content": body }
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
    "entity": "person.contact",
    "view_mode": "avatar",
    "record": 0
  }
]
```
