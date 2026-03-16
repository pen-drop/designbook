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

## List View Modes

Lists also use JSONata files, following the same pattern but with different naming and input:

> **Naming**: `list.{list_name}.{view_mode}.jsonata`

| List | View Mode | File |
|------|-----------|------|
| recent_articles | default | `view-modes/list.recent_articles.default.jsonata` |
| search | default | `view-modes/list.search.default.jsonata` |
| recent_articles | compact | `view-modes/list.recent_articles.compact.jsonata` |

### Input Variables

List expressions receive pre-rendered rows (NOT raw entity records) as bound variables:

| Variable | Type | Description |
|----------|------|-------------|
| `$rows` | array | Pre-rendered items — each record already processed through its entity view-mode JSONata |
| `$count` | number | Total number of records across all sources |
| `$limit` | number | Limit from list config (or total count if no limit) |

### Expression Format

A list expression returns a single `SceneNode` (typically a wrapper component):

```jsonata
/* view-modes/list.recent_articles.default.jsonata */
{
  "type": "component",
  "component": "view",
  "slots": {
    "title": "Recent Articles",
    "content": {
      "type": "component",
      "component": "grid",
      "props": { "columns": 3 },
      "slots": { "items": $rows }
    },
    "pager": {
      "type": "component",
      "component": "pager",
      "props": { "total": $count, "limit": $limit }
    }
  }
}
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
