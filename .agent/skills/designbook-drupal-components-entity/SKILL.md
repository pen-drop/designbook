---
name: Designbook Entity
description: Generates entity design components (node, block, media) from data model with sample data stories. Load this skill when DESIGNBOOK_TECHNOLOGY is drupal. Used when building Entity components.
---

# Designbook Entity

> **Component Type: Entity** — This skill generates **entity components** (node, block, media): structural wrappers with **minimal markup** (a single `<article>` wrapper element). They compose UI components in a single `content` slot using `type: ref` data bindings from `data.json`.

### Component Type Overview

| Type | Skill | Has Markup? | Location | Prefix | Provider |
|------|-------|-------------|----------|--------|----------|
| UI | `designbook-drupal-components-ui` | ✅ Yes — real HTML + CSS | `$DESIGNBOOK_DRUPAL_THEME/components/` | _(none)_ | Theme provider (e.g. `daisy_cms_daisyui`) |
| **Entity** ← this skill | `designbook-drupal-components-entity` | ❌ Minimal — `<article>` wrapper only | `$DESIGNBOOK_DIST/components/entity-*/` | `entity-` | `designbook_design` |
| Screen | `designbook-drupal-components-screen` | ❌ No — slots only | `$DESIGNBOOK_DIST/components/section-*/` | `section-` | `designbook_design` |

> [!CAUTION]
> **MANDATORY**: Before generating ANY entity components, you MUST read this entire SKILL.md AND the companion script:
> - [`generate-stories.js`](generate-stories.js) — Script that materializes sample data stories from template stories + `data.json`.

---

This skill generates **entity design components** from `data-model.json`. Each entity type/bundle in the data model gets its own design component with a single `content` slot that composes UI components.

Entity components are **structural** — they define a single `content` slot into which all UI components are composed sequentially. The visual design of each field is achieved by referencing **UI components** in the story's `content` slot.

> **Rendering**: Entity components are rendered by the **SDC addon** using Twig templates. Prop values that come from sample data use the **`type: ref`** syntax — a custom `storyNodesRenderer` that resolves field values from `data.json` at render time via `designbookStorage.js`. This keeps stories DRY: the story YAML defines the *structure* (which UI component renders which field), while the *data* comes from `data.json`.

> **How `type: ref` works**: The `refRenderer` registered in `.storybook/main.js` handles `{type: ref, field: X}` nodes. It reads the entity context (`type`, `bundle`, `record`) from `designbook.entity` metadata in `component.yml`, looks up the field value in the global data store, and passes the resolved value to the Twig template. For cross-entity references, use `{type: ref, path: 'entity_type.bundle.index.field'}` which bypasses context and resolves against the full store.

> ⛔ **CRITICAL RULE — Single Content Slot ONLY**: Entity components must have **EXACTLY ONE slot named `content`**. They must **NOT have any props** (no `view_mode`, no `variant`, etc.). All variation (teaser vs full) is handled by the **story** composing different UI components into the `content` slot.
>
> ⛔ **CRITICAL RULE — No Inline Markup**: Entity stories must contain **only `type: component`** references. Never use `type: element` with HTML tags, attributes, or CSS classes. Every field must be rendered by a reusable UI component.

## Prerequisites

1. This skill is **technology-specific** and should only be used when `DESIGNBOOK_TECHNOLOGY` is set to `drupal` in `designbook.config.yml`.
2. Load the configuration using the `designbook-configuration` skill to get `DESIGNBOOK_DIST` and `DESIGNBOOK_DRUPAL_THEME`.
3. `$DESIGNBOOK_DIST/data-model.json` must exist (run `/data-model` first).

**Required:**
- `$DESIGNBOOK_DIST/sections/[section-id]/data.json` — sample data consumed by the `refRenderer` at render time
- `.storybook/designbookStorage.js` — global data store (auto-loaded by `initStorage()` in `main.js`)
- `.storybook/refRenderer.js` — `storyNodesRenderer` plugin for `type: ref` resolution

**Optional but recommended:**
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

The entity skill produces **two tiers** of stories:

1. **Template stories** — contain `type: ref` bindings (e.g., `entity-node-article.full.story.yml`)
2. **Generated sample data stories** — materialized copies with actual values from `data.json` (e.g., `entity-node-article.content_blog_full_0.story.yml`)

Screen components reference the **generated** stories, not the templates.

```
$DESIGNBOOK_DIST/
└── components/
    └── entity-node-article/
        ├── entity-node-article.component.yml
        ├── entity-node-article.twig
        ├── entity-node-article.full.story.yml                    # ← TEMPLATE (type: ref)
        ├── entity-node-article.teaser.story.yml                  # ← TEMPLATE (type: ref)
        ├── entity-node-article.content_blog_full_0.story.yml     # ← GENERATED (record 0)
        ├── entity-node-article.content_blog_full_1.story.yml     # ← GENERATED (record 1)
        ├── entity-node-article.content_blog_teaser_0.story.yml   # ← GENERATED (record 0)
        └── entity-node-article.content_blog_teaser_1.story.yml   # ← GENERATED (record 1)
```

> **Naming conventions:**
> - Template stories: `[component].[viewmode].story.yml` — e.g., `entity-node-article.full.story.yml`
> - Generated stories: `[component].content_[section]_[viewmode]_[index].story.yml` — e.g., `entity-node-article.content_blog_full_0.story.yml`

## Execution Steps

### Step 1: Read Data Model

Read and parse `$DESIGNBOOK_DIST/data-model.json`:

```bash
cat $DESIGNBOOK_DIST/data-model.json
```

**If file doesn't exist:**
> "❌ Data model not found. Run `/debo-data-model` first to define your entities."

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

### Step 2: Verify or Generate Sample Data

For each section, verify that `$DESIGNBOOK_DIST/sections/[section-id]/data.json` exists:

```bash
cat $DESIGNBOOK_DIST/sections/[section-id]/data.json
```

This data is loaded by `designbookStorage.js` at Storybook startup and made available to the `refRenderer`. The story YAML uses `type: ref` to reference fields — the renderer resolves them against this data at render time.

Read the data to understand the field structure and determine record indices.

> ⛔ **CRITICAL: Sample data is REQUIRED.** Entity stories use `type: ref` bindings that resolve against `data.json`. Without sample data, stories render empty `[missing: ...]` placeholders — making them useless as design previews.
>
> **If `data.json` does not exist**, generate it before proceeding:
> 1. Read `data-model.json` to understand the entity structure and field types
> 2. Create `$DESIGNBOOK_DIST/sections/[section-id]/data.json` with realistic sample records
> 3. Include at least 3 records per entity type referenced by the section
> 4. Follow the standard data.json format with `_meta`, entity type groups, and indexed records

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

For each required UI component that doesn't exist yet, **create it** using the `designbook-drupal-components-ui` skill. Place them in the project's UI component library:

```
$DESIGNBOOK_DRUPAL_THEME/components/
├── heading/
│   ├── heading.component.yml
│   ├── heading.default.story.yml
│   └── heading.twig
├── text-block/
│   ├── text-block.component.yml
│   ├── text-block.default.story.yml
│   └── text-block.twig
├── badge/
│   ├── badge.component.yml
│   ├── badge.default.story.yml
│   └── badge.twig
├── figure/
│   ├── figure.component.yml
│   ├── figure.default.story.yml
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

**4.2 Create component definition with single `content` slot and entity metadata:**

```yaml
# entity-node-article.component.yml
$schema: "https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json"
name: entity_node_article
description: "Article entity. Structural design component — composes UI components for entity fields."
group: Entity
status: experimental
provider: designbook_design
designbook:
  entity:
    type: node
    bundle: article
    # record: 0  ← optional; omit for random record selection
thirdPartySettings:
  sdcStorybook:
    disableBasicStory: true
    tags: 
      - "!autodocs"

props:
  type: object
  properties: {}

slots:
  content:
    title: "Content"
    description: "All article content composed from UI components"
```

> **Important:** Entity components always have exactly ONE slot: `content`. All UI components are composed sequentially inside this slot.
>
> **`designbook.entity`** metadata tells the Vite plugin which entity type/bundle this component represents. At build time, the plugin rewrites `{type: ref, field: X}` to `{type: ref, path: entityType.bundle.[record.]X}`. If `record` is omitted, `resolvePath()` picks a random record at runtime from the available test data.
>
> **`thirdPartySettings.sdcStorybook.disableBasicStory: true`** prevents the SDC addon from auto-generating a default "Basic" story — only the stories defined in `.story.yml` are shown.

**4.3 Generate minimal Twig template:**

```twig
<article{{ attributes.addClass(['entity-[entitytype]-[bundle]']) }}>
  {{ content }}
</article>
```

The Twig template only renders the `content` slot inside a wrapper element. No per-field slot references.

**4.4 Generate template stories with `type: ref` data bindings:**

Template stories define the **structure** — which UI component renders which field — using `type: ref` bindings. They are NOT rendered directly; they serve as input for the story generator (Step 4.5).

> ⛔ **MANDATORY: Each view mode MUST have its own template story file.** E.g., `entity-node-article.full.story.yml` and `entity-node-article.teaser.story.yml`.

The story YAML composes UI components in the `content` slot. **Props bound to entity fields use `type: ref`** — the `refRenderer` resolves them at render time from `data.json` via `designbookStorage.js`. Static values (CTA text, layout flags) are written as literal strings/booleans.

The entity context (type, bundle, record) is set automatically from the `designbook.entity` metadata in `component.yml`. The `refRenderer` uses this context to resolve `field:` references against the correct record.

**Two `type: ref` forms:**

| Form | Syntax | Use case |
|------|--------|----------|
| **Field ref** | `{type: ref, field: title}` | Resolves against the current entity record (uses entity context) |
| **Path ref** | `{type: ref, path: block_content.contact_person.0.field_name}` | Resolves against the full data store (cross-entity, context-free) |

**Example for node/article (`entity-node-article.full.story.yml`):**

Given `data.json` with `node.article[0]` and `block_content.contact_person[0]`:

```yaml
name: full
slots:
  content:
    # Hero image — field_media is an object with url/alt subfields
    - type: component
      component: '[ui_provider]:figure'
      props:
        src:
          type: ref
          field: field_media.url
        alt:
          type: ref
          field: field_media.alt
        full_width: true

    # Heading — title and preheadline from entity fields
    - type: component
      component: '[ui_provider]:heading'
      props:
        text:
          type: ref
          field: title
        level: h1
        preheadline:
          type: ref
          field: field_teaser_preheadline

    # Body — rich text content from body field
    - type: component
      component: '[ui_provider]:text-block'
      props:
        content:
          type: ref
          field: body

    # Author box — cross-entity ref to block_content.contact_person
    - type: component
      component: '[ui_provider]:contact-card'
      props:
        name:
          type: ref
          path: block_content.contact_person.0.field_name
        title:
          type: ref
          path: block_content.contact_person.0.field_title
        email:
          type: ref
          path: block_content.contact_person.0.field_email
        phone:
          type: ref
          path: block_content.contact_person.0.field_phone
        image_url:
          type: ref
          path: block_content.contact_person.0.field_media.url
        image_alt:
          type: ref
          path: block_content.contact_person.0.field_media.alt
        variant: author

    # CTA banner — static values, no data binding
    - type: component
      component: '[ui_provider]:cta-banner'
      props:
        headline: 'Sie benötigen Unterstützung?'
        text: 'Lassen Sie uns über Ihr Drupal-Projekt sprechen.'
        button_label: 'Projekt besprechen'
        button_url: '/kontakt'
        variant: primary
```

**Key rules for story generation:**

1. **Entity-own fields** → use `{type: ref, field: <field_name>}` (short form, uses entity context from `designbook.entity`)
2. **Nested fields** → use dot notation: `{type: ref, field: field_media.url}`
3. **Cross-entity data** → use `{type: ref, path: <entity_type>.<bundle>.<index>.<field>}` (full path, context-free)
4. **Static values** (CTA text, layout flags, variants) → use literal strings/booleans directly
5. **Always `type: component`** in slots — never `type: element`
6. Replace `[ui_provider]` with the project's SDC provider (e.g., `daisy_cms_daisyui`)
7. Replace `[section-id]` with the actual section ID from the input parameters

**4.5 Generate sample data stories:**

After creating the template stories, run `generate-stories.js` to materialize the `type: ref` bindings into concrete stories with actual values from `data.json`:

```bash
cd $PROJECT_ROOT && node .agent/skills/designbook-drupal-components-entity/generate-stories.js
```

This script:
1. Reads each `data.json` from `$DESIGNBOOK_DIST/sections/*/`
2. For each entity template story (e.g., `entity-node-article.full.story.yml`), clones it per record
3. Resolves all `type: ref` bindings against the record's actual values
4. Writes generated stories named `content_[section]_[viewmode]_[index]`

> **Example:** Template `entity-node-article.full.story.yml` + `data.json` with 3 articles in section `blog` → generates:
> - `entity-node-article.content_blog_full_0.story.yml` (name: `content_blog_full_0`)
> - `entity-node-article.content_blog_full_1.story.yml` (name: `content_blog_full_1`)
> - `entity-node-article.content_blog_full_2.story.yml` (name: `content_blog_full_2`)
>
> **These generated stories are what screen components reference** via `story: content_blog_full_0`.

**4.6 Delegate** to `designbook-drupal-components-ui` with the component definition.

### Step 5: Verify Output

Check that components were created for each entity type/bundle:

```bash
find $DESIGNBOOK_DIST/components/entity-* -name "*.component.yml" | sort
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
- **Missing sample data**: **Generate** `data.json` from `data-model.json` before proceeding (see Step 2)
- **Missing screen designs**: Warn but continue with field-type-based mapping
- **Unknown field type**: Create a generic `text-display` UI component for it
- **UI component creation fails**: Report which component failed and why
- **File write fails**: Report which entity/file failed and why
- **designbook-drupal-components fails**: Pass through the error message

## Design Principles

1. **Single content slot**: Entity components have ONE slot (`content`). All UI components are composed sequentially inside it
2. **No inline markup**: Entity stories contain **only `type: component`** references — never `type: element` with HTML tags or CSS classes
3. **`type: ref` data binding**: Props bound to entity fields use `{type: ref, field: X}` or `{type: ref, path: X}`. Static values are literal strings. No materialized data duplication in stories
4. **Entity context via `designbook.entity`**: The `component.yml` declares entity type, bundle, and record index. The vite plugin sets this as context for the `refRenderer`
5. **UI components first**: Create reusable UI components before building entity design components
6. **Minimal Twig templates**: Entity Twig templates contain only `{{ content }}` inside a wrapper — no per-field slot references
7. **Data-driven**: Component structure is derived from `data-model.json`, not manually defined
8. **One component per pattern**: Multiple fields sharing the same visual pattern reuse the same UI component
9. **Separation of concerns**: Designbook entity components (in `$DESIGNBOOK_DIST/components/`) are structural wrappers. UI components (in `$DESIGNBOOK_DRUPAL_THEME/components/`) provide visual rendering
10. **Graceful degradation**: Without `data.json`, `type: ref` renders `[missing: field_name]` placeholders
11. **Delegated**: Actual file creation is handled by `designbook-drupal-components-ui`
12. **Provider**: Uses `designbook_design` as SDC provider for designbook components. UI components use the theme's provider
