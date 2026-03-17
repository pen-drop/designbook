---
description: Create a JSONata view-mode mapping file for an entity type/bundle/view mode
---

# Create View Mode

Creates a `.jsonata` view-mode mapping file that transforms a single entity record into `ComponentNode[]`.

## Input

- **Entity type** (e.g., `node`, `block_content`, `media`)
- **Bundle** (e.g., `article`, `contact_person`)
- **View mode** (e.g., `full`, `teaser`, `avatar`)

## Steps

1. **Read the data model** to get field definitions for this entity type/bundle:

```bash
DIST="${DESIGNBOOK_DIST:-designbook}"
cat "$DIST/data-model.yml"
```

Look for `content.{entity_type}.{bundle}.fields` — this tells you which fields are available and their types.

2. **Read sample data** to understand field values:

```bash
# Find data.yml files that contain this entity type
grep -rl "{entity_type}" "$DIST/sections/*/data.yml"
```

3. **Determine which components to use** based on field types.

Use the field-to-component guide from the main SKILL.md. For each field:
- Decide which UI component renders it
- Map field paths to component props/slots
- Add fallbacks for optional fields

4. **Write the expression file**:

```bash
DIST="${DESIGNBOOK_DIST:-designbook}"
mkdir -p "$DIST/view-modes"
# Output: $DIST/view-modes/{entity_type}.{bundle}.{view_mode}.jsonata
```

The expression receives a single entity record as input (the JSONata `$` root). Use field names directly — no `$` prefix needed (unlike the old `$field_name` syntax).

**Template for a typical view mode:**

```jsonata
/* {entity_type}.{bundle}.{view_mode}
 * Maps entity record fields to ComponentNode[]
 */
[
  /* Media/image field → figure component */
  field_media ? {
    "type": "component",
    "component": "figure",
    "props": {
      "src": field_media.url,
      "alt": field_media.alt ? field_media.alt : title
    }
  },

  /* Title field → heading component */
  {
    "type": "component",
    "component": "heading",
    "props": { "level": "h1" },
    "slots": { "text": title }
  },

  /* Body/text field → text-block component */
  {
    "type": "component",
    "component": "text-block",
    "slots": { "content": field_body }
  }
]
```

5. **Validate** the expression against sample data:

```bash
npx jsonata-w inspect "$DIST/view-modes/{entity_type}.{bundle}.{view_mode}.jsonata" \
  --input "$DIST/sections/{section}/data.yml"
```

Check:
- Output is an array of objects
- Each object has `type: "component"` and a valid `component` name
- Field values resolve correctly (not `null` for required fields)
- Fallbacks work for optional fields

## Common Patterns

### Teaser (summary) view mode

```jsonata
[
  field_media ? {
    "type": "component",
    "component": "figure",
    "props": { "src": field_media.url, "alt": field_media.alt }
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

### Full (detail) view mode

```jsonata
[
  {
    "type": "component",
    "component": "figure",
    "props": {
      "src": field_media.url,
      "alt": field_media.alt,
      "full_width": true
    }
  },
  {
    "type": "component",
    "component": "heading",
    "props": { "level": "h1" },
    "slots": { "text": title }
  },
  field_category ? {
    "type": "component",
    "component": "badge",
    "slots": { "label": field_category.name }
  },
  {
    "type": "component",
    "component": "text-block",
    "slots": { "content": field_body }
  }
]
```

### Avatar (minimal) view mode

```jsonata
[
  {
    "type": "component",
    "component": "avatar",
    "props": {
      "image": field_image ? field_image.url : null,
      "initials": $substring(field_name, 0, 1)
    },
    "slots": { "name": field_name }
  }
]
```

## Exit Conditions

✅ File created at `$DIST/view-modes/{entity_type}.{bundle}.{view_mode}.jsonata`
✅ `jsonata-w inspect` shows valid `ComponentNode[]` output
✅ All referenced components exist in the project
