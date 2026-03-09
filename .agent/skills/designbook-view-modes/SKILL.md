---
name: designbook-view-modes
description: Creates and validates JSONata view-mode mapping files that transform entity records into ComponentNode[] for rendering. Each .jsonata file defines how one entity_type.bundle.view_mode maps fields to UI components.
---

# Designbook View Modes

> Creates `view-modes/*.jsonata` files that define how entity records map to UI component trees. Each file is a pure JSONata expression that receives a single entity record and returns `ComponentNode[]`.

> [!IMPORTANT]
> **ONE file per view mode.** Each entity type + bundle + view mode combination gets its own `.jsonata` file.
>
> | Entity | View Mode | File |
> |--------|-----------|------|
> | node.article | full | `view-modes/node.article.full.jsonata` |
> | node.article | teaser | `view-modes/node.article.teaser.jsonata` |
> | block_content.contact_person | avatar | `view-modes/block_content.contact_person.avatar.jsonata` |

## Prerequisites

1. **Data model** with field definitions: `$DESIGNBOOK_DIST/data-model.yml`
2. **Sample data** in nested format: `$DESIGNBOOK_DIST/sections/{section}/data.yml` — see `@designbook-sample-data/SKILL.md` for format rules
3. **UI components** must exist (the components referenced in the expression)

> **Data lookup**: The renderer resolves `sampleData[entity_type][bundle][record]`. Sample data MUST use the nested `entity_type.bundle` format:
> ```yaml
> node:
>   article:
>     - id: "1"
>       title: "..."
> ```

## Output Structure

```
$DESIGNBOOK_DIST/
├── data-model.yml          # Pure data schema (fields only, NO view_modes)
├── view-modes/             # JSONata mapping expressions
│   ├── node.article.full.jsonata
│   ├── node.article.teaser.jsonata
│   └── block_content.contact_person.avatar.jsonata
└── sections/blog/data.yml  # Sample data for testing
```

> **Naming**: `{entity_type}.{bundle}.{view_mode}.jsonata`

## Expression Format

Each `.jsonata` file is a pure JSONata expression. Input is a single entity record from `data.yml`. Output is `ComponentNode[]`.

```jsonata
/* view-modes/node.article.teaser.jsonata
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

The addon resolves `type: entity` nodes recursively by loading and evaluating the referenced `.jsonata` file.

## Field-to-Component Mapping Guide

| Field Type | Suggested Component | Props/Slots |
|------------|-------------------|-------------|
| `string` (title) | `heading` | slots: `{text: title}`, props: `{level: "h1"}` |
| `text` / `text_long` | `text-block` | slots: `{content: field_body}` |
| `reference` (media.image) | `figure` | props: `{src: field_media.url, alt: field_media.alt}` |
| `reference` (taxonomy) | `badge` | slots: `{label: field_category.name}` |
| `datetime` | `date-display` | props: `{date: field_date}` |
| `link` | `button` or `link` | props: `{url: field_link.url}`, slots: `{label: field_link.title}` |
| `boolean` | (conditional) | Use `field_flag ? {...} : null` pattern |
| `integer` / `float` | `stat` or inline | props: `{value: field_count}` |

## Validation

Test expressions against sample data using `jsonata-w`:

```bash
# Inspect — see the output structure
npx jsonata-w inspect view-modes/node.article.teaser.jsonata \
  --input sections/blog/data.yml

# Transform — full transform with output
npx jsonata-w transform view-modes/node.article.teaser.jsonata \
  --input sections/blog/data.yml
```

Or test programmatically with the `jsonata` library:

```typescript
import jsonata from 'jsonata';
const expr = readFileSync('view-modes/node.article.teaser.jsonata', 'utf-8');
const record = { title: 'Test', field_media: { url: '/img.jpg' } };
const result = await jsonata(expr).evaluate(record);
// result = ComponentNode[]
```

## No `@config` Block

Unlike `jsonata-w` CLI usage for CSS generation, view-mode expressions do NOT use `@config` blocks:
- Input is provided programmatically by the addon (entity record from `data.yml`)
- Output is consumed in-memory (not written to a file)
- The expression file contains ONLY the JSONata expression

## Steps

- [create-view-mode](./steps/create-view-mode.md): Creates a JSONata view-mode mapping file for an entity type/bundle/view mode.

## Error Handling

| Error | Fix |
|-------|-----|
| Component not found at render time | Create the UI component first (heading, figure, etc.) |
| Entity type not in data-model.yml | Add entity to `data-model.yml` fields section |
| Record not found in data.yml | Add more records to section's `data.yml` |
| JSONata syntax error | Check expression syntax — use `npx jsonata-w inspect` to debug |
| Field resolves to null | Add fallback: `field_x ? field_x : "default"` |
| Nested entity .jsonata missing | Create the referenced view-mode file |
