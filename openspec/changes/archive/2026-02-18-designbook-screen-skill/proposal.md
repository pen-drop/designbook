## Why

The existing `debo-design-screen` workflow produces a markdown document (`screen-designs.md`) describing screen layouts for a section. But there is no skill that turns this document into actual Drupal SDC components. The gap between "design description" and "renderable components in Storybook" must be bridged.

Currently, UI components exist under `$DESIGNBOOK_DRUPAL_THEME/components/` (buttons, cards, etc.), but the higher-level design composition — shell pieces (header/footer), entity view modes, and full-page screens — has no standardized structure or generation skill.

## What Changes

- **New skill `designbook-screen`** that reads `screen-designs.md` and the data model to generate a layered component hierarchy:
  1. **Shell components** (header, footer) — design-level wrappers that reference UI components
  2. **Entity components** — one per entity type/bundle from the data model, with stories per view mode
  3. **Screen components** — one per section, composing header + entity content + footer

- **Update workflow `debo-design-screen`** to call the skill after saving the document (optional step)

- **Establish directory conventions** for design-level components:
  - `$DESIGNBOOK_DIST/design/shell/header/` — shell header component
  - `$DESIGNBOOK_DIST/design/shell/footer/` — shell footer component
  - `$DESIGNBOOK_DIST/design/entity/[entity_type]/[bundle]/` — entity components
  - `$DESIGNBOOK_DIST/design/sections/[section-id]/` — screen components

## Component Layer Architecture

### Layer 1: UI Components (`$DESIGNBOOK_DRUPAL_THEME/components/`)
Pure visual components (Button, Card, Hero, etc.). Already handled by `designbook-drupal-components` skill.

### Layer 2: Shell Components (`$DESIGNBOOK_DIST/design/shell/`)
Header and Footer. These are SDC components that **use** UI components from Layer 1. They appear in Storybook as standalone stories for the shell.

### Layer 3: Entity Components (`$DESIGNBOOK_DIST/design/entity/[entity_type]/[bundle]/`)
One component per entity type/bundle from `data-model.json`. Maps to Drupal's entity display system:
- **Stories = View Modes**: Each story variant represents a view mode (e.g., `full`, `teaser`, `card`)
- **Structured entities** (e.g., `node/article`): Component has typed props/slots matching data model fields
- **Unstructured entities** (e.g., `node/page`, landing pages): Component has a single `content` slot. In the screen, layout components (which are also UI components) compose block entity components inside this slot
- **Block entities** (`block/[bundle]`): Have only one view mode, use UI components directly

### Layer 4: Screen Components (`$DESIGNBOOK_DIST/design/sections/[section-id]/`)
Full page composition. Each screen component:
- References shell header and footer
- Renders an entity component in the content area (entity_type/bundle in view mode `full`)
- Appears in Storybook underneath the section folder

### Composition Example: "News" section

```
Screen: section_news
├── shell_header (→ design/shell/header)
├── entity_node_article (view mode: full)
│   ├── field_image → UI Component: media-image
│   ├── field_body → rendered text
│   └── field_tags → UI Component: badge
└── shell_footer (→ design/shell/footer)
```

### Composition Example: "Landing Page" (unstructured)

```
Screen: section_landing
├── shell_header
├── entity_node_page (view mode: full)
│   └── content slot
│       ├── Layout Component: layout (UI Component)
│       │   ├── column_1: entity_block_hero (→ UI Component: hero)
│       │   └── column_2: entity_block_cta (→ UI Component: card)
│       └── Layout Component: layout (full-width)
│           └── column_1: entity_block_testimonials (→ UI Component: carousel)
└── shell_footer
```

## Storybook Indexer Extension

The Storybook addon (`storybook-addon-designbook`) currently only indexes:
- `sections/*.section.yml` → `Sections/[Title]` in the sidebar

It must be extended to also scan `.component.yml` files inside the design directories and map them to the correct Storybook sidebar folders:

| Directory | Storybook Sidebar Path | Example |
|-----------|----------------------|---------|
| `$DESIGNBOOK_DIST/design/shell/header/` | `Design/Shell/Header` | Header component |
| `$DESIGNBOOK_DIST/design/shell/footer/` | `Design/Shell/Footer` | Footer component |
| `$DESIGNBOOK_DIST/design/entity/node/article/` | `Design/Entity/Node/Article` | Article entity component |
| `$DESIGNBOOK_DIST/design/entity/block/hero/` | `Design/Entity/Block/Hero` | Hero block component |
| `$DESIGNBOOK_DIST/design/sections/[section-id]/` | `Sections/[Section Title]/Screen` | Full page screen |

### Changes to `preset.ts`:
- `stories()` function: Add glob for `$DESIGNBOOK_DIST/design/**/*.component.yml`
- `experimental_indexers`: Add a new indexer for `.component.yml` files in `design/` that:
  - Reads the component YAML to get name/title
  - Derives the sidebar path from the directory structure (`design/shell/header` → `Design/Shell/Header`)
  - Creates story index entries

### Changes to `vite-plugin.ts`:
- `load()` function: Handle `.component.yml` from `design/` directories — transform them into CSF modules using the existing `.story.yml` alongside

This ensures all generated design components are **immediately visible in Storybook** under their correct hierarchy without manual configuration.

## Capabilities

### New Capabilities
- `designbook-screen`: Skill that generates the layered component hierarchy (shell, entity, screen) from screen-designs.md and data-model.json. Covers directory conventions, component generation using `designbook-drupal-components`, and Storybook integration.
- `storybook-design-indexer`: Extension to the Storybook addon indexer that scans `$DESIGNBOOK_DIST/design/` for `.component.yml` files and maps them to the correct sidebar hierarchy.

### Modified Capabilities
- (none — the existing workflow stays as-is, the skill is additive)

## Impact

- **New files**: `.agent/skills/designbook-screen/SKILL.md` + resources
- **New directories**: `$DESIGNBOOK_DIST/design/shell/`, `$DESIGNBOOK_DIST/design/entity/`, `$DESIGNBOOK_DIST/design/sections/`
- **Dependencies**: `designbook-drupal-components` (for actual SDC file generation), `designbook-data-model` (for entity type/bundle discovery), `designbook-configuration` (for env vars)
- **Storybook addon**: `preset.ts` + `vite-plugin.ts` extended with design directory indexer
- **Workflow update**: `debo-design-screen` gets an optional final step to invoke the skill
