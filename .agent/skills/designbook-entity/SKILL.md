---
name: Designbook Entity
description: Generates entity design components (node, block, media) from data model with sample data stories. Load this skill when DESIGNBOOK_TECHNOLOGY is drupal.
---

# Designbook Entity

This skill generates **entity design components** from `data-model.json`. Each entity type/bundle in the data model gets its own design component with a single `content` slot that composes UI components.

Entity components are **structural** — they define a single `content` slot into which all UI components are composed sequentially. The visual design of each field is achieved by referencing **UI components** in the story's `content` slot, with prop values bound to test data from `data.json` using `$ref:` prefixes.

> ⛔ **CRITICAL RULE — No Inline Markup**: Entity stories must contain **only `type: component`** references. Never use `type: element` with HTML tags, attributes, or CSS classes. Every field must be rendered by a reusable UI component. If a required UI component doesn't exist, **create it first**.

## Prerequisites

1. This skill is **technology-specific** and should only be used when `DESIGNBOOK_TECHNOLOGY` is set to `drupal` in `designbook.config.yml`.
2. Load the configuration using the `designbook-configuration` skill to get `DESIGNBOOK_DIST` and `DESIGNBOOK_DRUPAL_THEME`.
3. `$DESIGNBOOK_DIST/data-model.json` must exist (run `/data-model` first).

**Optional but recommended:**
- `$DESIGNBOOK_DIST/sections/[section-id]/data.json` — sample data for story population
- `$DESIGNBOOK_DIST/sections/[section-id]/screen-designs.md` — field-to-UI-component mapping

## Input Parameters

Expected as JSON object:

```json
{
  "section-id": "news"
}
```

**Optional fields:**
- `section-id` (string). When provided, only generates entity components referenced by that section. When omitted, generates components for all entity types/bundles in the data model.

## Output Structure

```
$DESIGNBOOK_DIST/
└── design/
    └── entity/
        ├── node/
        │   ├── article/
        │   │   ├── entity-node-article.component.yml
        │   │   ├── entity-node-article.story.yml
        │   │   └── entity-node-article.twig
        │   └── page/
        │       ├── entity-node-page.component.yml
        │       ├── entity-node-page.story.yml
        │       └── entity-node-page.twig
        ├── block/
        │   └── hero/
        │       ├── entity-block-hero.component.yml
        │       ├── entity-block-hero.story.yml
        │       └── entity-block-hero.twig
        └── media/
            └── image/
                ├── entity-media-image.component.yml
                ├── entity-media-image.story.yml
                └── entity-media-image.twig
```

## Execution Steps

### Step 1: Read Data Model

Read and parse `$DESIGNBOOK_DIST/data-model.json`:

```bash
cat $DESIGNBOOK_DIST/data-model.json
```

**If file doesn't exist:**
> "❌ Data model not found. Run `/data-model` first to define your entities."

Stop here.

Extract the entity types and bundles. The data model has this structure:

```json
{
  "content": {
    "[entity_type]": {
      "[bundle]": {
        "title": "...",
        "description": "...",
        "fields": {
          "[field_name]": { "type": "...", "label": "..." }
        }
      }
    }
  }
}
```

> **Drupal mapping:** `content.node.*` = node entities, `content.media.*` = media entities, `content.taxonomy_term.*` = taxonomy terms. Block entities may also appear here once the screen-designs.md references them.

### Step 2: Read Sample Data (Optional)

For each section, try to read `$DESIGNBOOK_DIST/sections/[section-id]/data.json`:

```bash
cat $DESIGNBOOK_DIST/sections/[section-id]/data.json
```

If available, use the first record of each entity type to populate story slot values. If not available, use placeholder values and warn:

> "⚠️ No sample data found for section `[section-id]`. Stories will use placeholder values. Run `/sample-data` to create realistic content."

### Step 3: Read Screen Designs (Optional)

For each section, try to read `$DESIGNBOOK_DIST/sections/[section-id]/screen-designs.md`:

If available, parse to determine which UI component renders each field.

If not available, derive UI components from field types using the mapping in Step 3b.

### Step 3b: Map Fields to UI Components

For each entity, determine which **UI components** are needed to render each field. Every field must be rendered by a component — no inline markup allowed.

**Standard field-to-component mapping:**

| Field Type | UI Component | Component Props |
|------------|-------------|-----------------|
| `string` (title) | `heading` | `text`, `level` (h1/h2/h3) |
| `text` / `text_long` | `text-block` | `content`, `truncate` (boolean) |
| `image` / `entity_reference` (media) | `figure` | `src`, `alt`, `caption` |
| `entity_reference` (taxonomy) | `badge` | `label`, `variant` |
| `datetime` | `date-display` | `date`, `format` |
| `link` | `link` or existing `button` | `url`, `label` |
| `boolean` | `status-indicator` | `value`, `label` |
| `list_string` | `tag-list` | `items` |

> **Note:** The goal is 1 UI component per visual pattern, not per field. If multiple fields use the same pattern (e.g., two text fields), they share the same UI component with different prop values.

### Step 3c: Audit Existing UI Components

Scan the project's component library:

```bash
find $DESIGNBOOK_DRUPAL_THEME/components/ -name "*.component.yml" 2>/dev/null | sort
```

For each component found, read its `.component.yml` to understand its props and slots.

### Step 3d: Create Missing UI Components

For each required UI component that doesn't exist yet, **create it** using the `designbook-drupal-components` skill. Place them in the project's component library:

```
$DESIGNBOOK_DRUPAL_THEME/components/
├── heading/
│   ├── heading.component.yml
│   ├── heading.story.yml
│   └── heading.twig
├── text-block/
│   ├── text-block.component.yml
│   ├── text-block.story.yml
│   └── text-block.twig
├── badge/
│   ├── badge.component.yml
│   ├── badge.story.yml
│   └── badge.twig
├── figure/
│   ├── figure.component.yml
│   ├── figure.story.yml
│   └── figure.twig
└── ...
```

Each UI component should:
- Be a **self-contained, reusable** component
- Accept **props** for its content (not slots with raw HTML)
- Have a **Twig template** using CSS framework classes (e.g., DaisyUI) for visual styling
- Have a **story** with realistic sample data
- Use the correct **provider** from the theme config

Present the mapping to the user and ask for confirmation:

> "For **[entity_type/bundle]**, I'll use these UI components:
>
> | Field | UI Component | Status |
> |-------|-------------|--------|
> | field_title | `heading` | 🆕 NEW |
> | field_body | `text-block` | 🆕 NEW |
> | field_image | `figure` | 🆕 NEW |
> | field_category | `badge` | 🆕 NEW |
>
> I need to create 4 new components. Shall I proceed?"

### Step 4: Generate Entity Components

For each entity type/bundle in the data model:

**4.1 Determine component name:** `entity-[entitytype]-[bundle]`
- `node/article` → `entity-node-article`
- `block/hero` → `entity-block-hero`
- `media/image` → `entity-media-image`

**4.2 Create component definition with single `content` slot:**

```yaml
# entity-node-article.component.yml
name: entity_node_article
description: "Article. Structural design component — composes UI components for entity fields."
status: experimental
provider: designbook_design
slots:
  content:
    title: "Content"
    description: "All article content composed from UI components"
```

> **Important:** Entity components always have exactly ONE slot: `content`. All UI components are composed sequentially inside this slot.

**4.3 Generate minimal Twig template:**

```twig
<article{{ attributes.addClass(['entity-[entitytype]-[bundle]']) }}>
  {{ content }}
</article>
```

The Twig template only renders the `content` slot inside a wrapper element. No per-field slot references.

**4.4 Generate story with `designbook:` metadata and `$ref:` props:**

The story YAML uses a `designbook:` block to declare the data source, then composes UI components in the `content` slot. Prop values use `$ref:` prefix to bind to test data fields.

**Example for node/article (Full View):**

```yaml
designbook:
  testdata: designbook/sections/[section-id]/data.json
  entity_type: node
  bundle: article
  record: 0

name: Full View
slots:
  content:
    - type: component
      component: '[ui_provider]:heading'
      props:
        text: '$ref:title'
        level: h1
        preheadline: '$ref:field_teaser_preheadline'
    - type: component
      component: '[ui_provider]:figure'
      props:
        src: '$ref:field_media.url'
        alt: '$ref:field_media.alt'
        full_width: true
    - type: component
      component: '[ui_provider]:text-block'
      props:
        content: '$ref:body'
    - type: component
      component: '[ui_provider]:contact-card'
      props:
        name: '$ref:block_content.contact_person.0.field_name'
        title: '$ref:block_content.contact_person.0.field_title'
        variant: author
    - type: component
      component: '[ui_provider]:cta-banner'
      props:
        headline: "Sie benötigen Unterstützung?"
        variant: ocean
```

**Key rules for story generation:**

1. **`$ref:` prefix** = resolve from `data.json` at build time. Without prefix = literal value.
2. **Dot-notation** for nested fields: `$ref:field_media.url` → `record.field_media.url`
3. **Cross-entity refs** use full path: `$ref:block_content.contact_person.0.field_name` (uses root data, not just the entity record)
4. **Static components** (CTA, banners) use literal props without `$ref:`
5. Replace `[ui_provider]` with the project's SDC provider (e.g., `daisy_cms_daisyui`)
6. Replace `[section-id]` with the actual section ID from the input parameters

**4.5 Delegate** to `designbook-drupal-components` with the component definition.

### Step 5: Verify Output

Check that components were created for each entity type/bundle:

```bash
find $DESIGNBOOK_DIST/design/entity/ -name "*.component.yml" | sort
find $DESIGNBOOK_DRUPAL_THEME/components/ -name "*.component.yml" | sort
```

**If successful:**
> "✅ **Entity components created!**
>
> **UI Components created/reused:**
> | Component | Status | Used by |
> |-----------|--------|---------|
> | `heading` | 🆕 NEW | field_title |
> | `text-block` | 🆕 NEW | field_body |
> | `figure` | 🆕 NEW | field_image |
> | `badge` | 🆕 NEW | field_category |
>
> **Entity Design Components:**
> | Entity | Component | Fields |
> |--------|-----------|--------|
> | node/article | `entity-node-article` | field_title, field_body, field_image |
> | node/page | `entity-node-page` | field_body |
>
> **Data sources:**
> - Fields: from `data-model.json`
> - Sample values: from `data.json` [✓ found / ⚠️ using placeholders]
> - UI components: from component library [N created / M reused]
>
> Next: Run `designbook-screen` to compose entity + shell into full screen views."

## Error Handling

- **Missing data-model.json**: Report error, suggest running `/data-model`
- **Missing sample data**: Warn but continue with placeholder values
- **Missing screen designs**: Warn but continue with field-type-based mapping
- **Unknown field type**: Create a generic `text-display` UI component for it
- **UI component creation fails**: Report which component failed and why
- **File write fails**: Report which entity/file failed and why
- **designbook-drupal-components fails**: Pass through the error message

## Design Principles

1. **Single content slot**: Entity components have ONE slot (`content`). All UI components are composed sequentially inside it
2. **No inline markup**: Entity stories contain **only `type: component`** references — never `type: element` with HTML tags or CSS classes
3. **`$ref:` data binding**: Props use `$ref:` prefix to bind to test data from `data.json`. Literal values have no prefix
4. **UI components first**: Create reusable UI components before building entity design components
5. **Minimal Twig templates**: Entity Twig templates contain only `{{ content }}` inside a wrapper — no per-field slot references
6. **Data-driven**: Component structure is derived from `data-model.json`, not manually defined
7. **One component per pattern**: Multiple fields sharing the same visual pattern reuse the same UI component
8. **Separation of concerns**: Design entity components (in `design/`) are structural wrappers. UI components (in `components/`) provide visual rendering
9. **Graceful degradation**: Works without sample data (uses `[missing: field]` placeholders)
10. **Delegated**: Actual file creation is handled by `designbook-drupal-components`
11. **Provider**: Uses `designbook_design` as SDC provider for design components. UI components use the theme's provider
