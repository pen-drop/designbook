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
    "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:figure",
    "props": {
      "src": image.url,
      "alt": image.alt ? image.alt : title
    }
  },
  {
    "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:heading",
    "props": { "level": "h3" },
    "slots": { "text": title }
  },
  {
    "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:text-block",
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
| `component` | ✅ | string | Component name with provider prefix (`$DESIGNBOOK_COMPONENT_NAMESPACE:name`) — resolved at generation time |
| `props` | ❌ | object | Data/configuration values passed to the component |
| `slots` | ❌ | object | Rendered content slots (strings, arrays, or nested nodes) |

> ⛔ **Provider prefix is required.** Always use `$DESIGNBOOK_COMPONENT_NAMESPACE:component-name` in JSONata output — never bare component names. The prefix is resolved at generation time, not at render time.

### Entity Reference Nodes

For cross-entity rendering, return an entity reference node. The addon resolves it recursively by loading the referenced `.jsonata` file.

The format is identical in scene YAML and JSONata output:

```jsonata
{ "entity": "node.article", "view_mode": "teaser", "record": 0 }
```

| Key | Required | Type | Description |
|-----|----------|------|-------------|
| `entity` | ✅ | `"entity_type.bundle"` | Two-part dot string (e.g. `node.article`, `media.image`, `paragraph.slider`) |
| `view_mode` | ✅ | string | View mode / mapping to apply |
| `record` | ❌ | integer | Sample data record index (default: 0) |

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
    "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:heading",
    "props": { "level": "h1" },
    "slots": { "text": title }
  },
  image ? {
    "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:figure",
    "props": {
      "src": image.url,
      "alt": image.alt
    }
  },
  {
    "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:text-block",
    "slots": { "content": body }
  }
]
```

### Entity Reference in JSONata

Embedding a contact card from another entity type:

```jsonata
[
  {
    "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:heading",
    "props": { "level": "h1" },
    "slots": { "text": title }
  },
  { "entity": "person.contact", "view_mode": "avatar", "record": 0 }
]
```

### Parent Entity Orchestrating Children

A landing page that delegates to child paragraph entities:

```jsonata
(
  $page := $;
  [
    $page.field_banner_enabled ? {
      "component": "$DESIGNBOOK_COMPONENT_NAMESPACE:hero-banner",
      "props": { "gradient": "green-to-yellow" }
    },
    { "entity": "paragraph.icon_link_boxes", "view_mode": "default", "record": 0 },
    { "entity": "paragraph.slider", "view_mode": "default", "record": 0 }
  ]
)
```
