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

## Task Files

- [create-view-modes.md](tasks/create-view-modes.md) — Create `.jsonata` view-mode expression files

## Resources

- [jsonata-reference.md](resources/jsonata-reference.md) — Expression format, ComponentNode structure, JSONata syntax, conditional components, nested entities, composition patterns
- [field-mapping.md](resources/field-mapping.md) — Field type to component mapping guide
- [list-view-modes.md](resources/list-view-modes.md) — List view mode format, input variables, expression examples

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
