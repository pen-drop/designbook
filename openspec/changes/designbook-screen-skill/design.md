## Context

The Designbook ecosystem currently handles:
- **Product planning** — vision, roadmap, sections, data model (all markdown/JSON in `$DESIGNBOOK_DIST/`)
- **Design system** — tokens, CSS generation (`designbook-tokens`, `designbook-css-daisyui`)
- **UI components** — Drupal SDC components under `$DESIGNBOOK_DRUPAL_THEME/components/` (`designbook-drupal-components`)
- **Screen descriptions** — markdown documents from `debo-design-screen` workflow

The gap: there's no structured way to compose UI components into higher-level design artifacts (entity displays, shell pieces, full screens) that render in Storybook. The `debo-design-screen` workflow produces descriptive markdown, but nothing turns that into renderable components.

**Existing infrastructure:**
- Storybook addon with a custom indexer scanning `sections/*.section.yml` → sidebar entries
- Vite plugin transforming `.section.yml` into CSF modules via a template (`section.story.tpl`)
- `designbook-drupal-components` skill generating `.component.yml`, `.story.yml`, `.twig` files
- `data-model.json` containing entity types and bundles with field definitions

## Goals / Non-Goals

**Goals:**
- Define a 4-layer component architecture (UI → Shell → Entity → Screen)
- Create 3 atomic skills for layers 2-4: `designbook-shell`, `designbook-entity`, `designbook-screen`
- Extend the Storybook indexer to discover and display design components
- Use directory structure as the source of truth for Storybook sidebar hierarchy

**Non-Goals:**
- Modifying existing UI component generation (`designbook-drupal-components` stays as-is)
- Building a visual page builder or drag-and-drop interface
- Generating production-ready Drupal templates (these are design-phase prototypes)
- Handling Drupal's actual view mode configuration (that's implementation phase)

## Decisions

### 1. Directory Structure as Convention

**Decision:** Use a fixed directory convention under `$DESIGNBOOK_DIST/design/` for all design-level components.

**Naming convention:** Component files use a unique prefix derived from the full path (layer + type + bundle), joined by underscores. This avoids name collisions (e.g., a UI `header` component vs. the design `shell_header`).

```
$DESIGNBOOK_DIST/
└── design/
    ├── shell/
    │   ├── header/
    │   │   ├── shell_header.component.yml
    │   │   ├── shell_header.story.yml
    │   │   └── shell_header.twig
    │   └── footer/
    │       ├── shell_footer.component.yml
    │       ├── shell_footer.story.yml
    │       └── shell_footer.twig
    ├── entity/
    │   ├── node/
    │   │   ├── article/
    │   │   │   ├── entity_node_article.component.yml
    │   │   │   ├── entity_node_article.story.yml    ← stories = view modes
    │   │   │   └── entity_node_article.twig
    │   │   └── page/
    │   │       ├── entity_node_page.component.yml
    │   │       ├── entity_node_page.story.yml
    │   │       └── entity_node_page.twig
    │   └── block/
    │       └── hero/
    │           ├── entity_block_hero.component.yml
    │           ├── entity_block_hero.story.yml       ← single view mode
    │           └── entity_block_hero.twig
    └── sections/
        └── news/
            ├── article-list/
            │   ├── section_news_article_list.component.yml
            │   ├── section_news_article_list.story.yml
            │   └── section_news_article_list.twig
            └── article-detail/
                ├── section_news_article_detail.component.yml
                ├── section_news_article_detail.story.yml
                └── section_news_article_detail.twig
```

**Rationale:** Directory path directly maps to Storybook sidebar path. No additional config needed. The indexer derives the title from the path.

**Alternative considered:** Flat directory with naming convention (e.g., `shell--header.component.yml`). Rejected because it loses the visual hierarchy and makes file management harder.

### 2. Markup Responsibility: UI Components Only

**Decision:** Only UI components under `$DESIGNBOOK_DRUPAL_THEME/components/` contain real HTML markup in their Twig templates. All design components under `$DESIGNBOOK_DIST/design/` are **purely structural** — they compose via slots and references but have no markup of their own.

```
$DESIGNBOOK_DRUPAL_THEME/components/   ← HAS markup (HTML, CSS classes, DaisyUI)
  button/button.twig                   →  <button class="btn {{ variant }}">{{ text }}</button>
  hero/hero.twig                       →  <section class="hero">...</section>
  grid/grid.twig                       →  <div class="grid grid-cols-{{ columns }}">{{ content }}</div>

$DESIGNBOOK_DIST/design/                          ← NO markup (structural composition only)
  entity/node/article/entity_node_article.twig     →  {{ title }}{{ field_body }}{{ field_image }}
  shell/header/shell_header.twig                   →  {{ navigation }}{{ logo }}{{ user_menu }}
  sections/news/section_news.twig                  →  {{ header }}{{ content }}{{ footer }}
```

**Rationale:** Design components represent Drupal's entity/display system, not visual elements. They define *what* is shown and in *what order*, but delegate *how* it looks to UI components. This mirrors Drupal's separation of entity templates (structural) and component templates (visual).

### 3. Reuse `designbook-drupal-components` for File Generation

**Decision:** The `designbook-screen` skill generates component definitions as JSON and delegates actual file creation to `designbook-drupal-components`.

**Rationale:** Single responsibility — `designbook-drupal-components` already handles `.component.yml`, `.story.yml`, `.twig` generation with validation. No need to duplicate that logic.

**Key difference:** The output path changes. For UI components it's `$DESIGNBOOK_DRUPAL_THEME/components/`. For design components it's `$DESIGNBOOK_DIST/design/[layer]/[path]/`. The skill must pass the correct target directory.

### 4. Entity Components Derive From Data Model

**Decision:** Entity components are generated by reading `$DESIGNBOOK_DIST/data-model.json`. Each entity type/bundle becomes one component. Fields from the data model map to component slots/props.

```json
// data-model.json → entity component
{
  "content": {
    "node": {
      "article": {
        "fields": {
          "title": { "type": "string" },
          "field_body": { "type": "text" },
          "field_image": { "type": "reference" }
        }
      }
    }
  }
}
```

→ Generates: `design/entity/node/article/entity_node_article.component.yml` with:
- Slots for each field (`title`, `field_body`, `field_image`)
- Stories for each view mode (`full` is always default, others from screen-designs.md)

**Structured vs. Unstructured View Modes:**

This is NOT a property of the entity type — it's a property of the **view mode**:

- **Structured view modes** use data fields directly. The entity component renders its own field slots filled with UI components. Example: `node/article` in view mode `full` renders `field_image`, `field_body`, `field_tags` directly.

- **Unstructured view modes** compose sub-entities. The entity component has a `content` slot where **layout components** arrange **block entity components**. Example: `node/page` in view mode `full` has a `content` slot filled with layout → blocks.

An entity CAN have both structured and unstructured view modes. Example:
- `node/article/full` → structured (fields rendered directly)
- `node/article/landing` → unstructured (content slot with layout + blocks)

### 5. Layout Component Convention

**Decision:** There is typically one layout component called `layout` (a UI component under `$DESIGNBOOK_DRUPAL_THEME/components/layout/`). It has one slot per column and internally uses a generic `grid` UI component for CSS grid rendering.

```
$DESIGNBOOK_DRUPAL_THEME/components/
├── grid/           ← generic CSS grid (UI component with markup)
│   └── grid.twig   →  <div class="grid grid-cols-{{ columns }}">{{ content }}</div>
└── layout/         ← layout with named column slots (UI component)
    └── layout.twig →  {% include 'grid' %} with slots: {{ column_1 }}, {{ column_2 }}, ...
```

In an unstructured entity view mode:
```
Entity: node/page (view mode: full) [structural, no markup]
└── content slot
    └── Layout component [UI, has markup via grid]
        ├── column_1 slot → Block: block/hero [structural] → UI: hero [markup]
        └── column_2 slot → Block: block/cta [structural] → UI: card [markup]
```

**Rationale:** Most Drupal sites use simple layouts. One `layout` component with configurable columns covers 90% of cases. The `grid` component handles the actual CSS grid markup.

### 6. Block Entities Are Minimal Wrappers

**Decision:** Block entity components only have one view mode (no `full`/`teaser` distinction). They wrap UI components directly.

```
entity_block_hero → uses UI component: hero
entity_block_cta → uses UI component: card (or cta if exists)
```

**Rationale:** Blocks in Drupal are simpler entities. They don't have multiple display modes. They exist to bridge the gap between entity system and UI component.

### 7. Screen Components Compose Header + Entity + Footer

**Decision:** Each section can have **multiple pages** (screens). Each page is a separate component under `$DESIGNBOOK_DIST/design/sections/[section-id]/[page-name]/`.

Each screen component has exactly 3 slots:
- `header` — references shell header component
- `content` — renders an entity component in a specific view mode
- `footer` — references shell footer component

The naming follows: `section_[sectionid]_[pagename]`. Example: `section_news_article_list`, `section_news_article_detail`.

The screen's stories populate these slots with actual data from `data.json` (section sample data). The screen itself is **structural only** — no markup, just composition.

### 8. Sample Data Becomes Stories

**Decision:** The `.story.yml` files are the **only place** where concrete content lives. The skill generates them by combining three inputs:

```
data-model.json     →  Which slots/fields exist on the entity
data.json           →  Realistic sample values for those fields
screen-designs.md   →  Which UI component renders each field
```

**Transformation flow:**

```
data.json (technology-neutral)
  ↓  skill reads field values
  ↓  skill reads screen-designs.md for component mapping
  ↓  skill generates story entries
.story.yml (technology-specific, e.g. Drupal SDC)
```

**Example:** For `entity_node_article`:

```yaml
# Generated entity_node_article.story.yml
stories:
  full:
    title: Full View
    slots:
      field_title:
        - type: element
          tag: h1
          value: "Breaking: New Climate Report Published"   # ← from data.json
      field_body:
        - type: element
          value: "<p>The latest report shows...</p>"        # ← from data.json
      field_image:
        - type: component
          component: 'provider:media-image'                 # ← from screen-designs.md
          props:
            uri: https://placehold.co/800x400               # ← from data.json
```

**Shell navigation** is auto-derived from `sections/*.section.yml` files:

```yaml
# Generated shell_header.story.yml
stories:
  preview:
    slots:
      navigation:
        - type: component
          component: 'provider:main-nav'
          props:
            items:                         # ← auto-generated from section.yml files
              - label: News
                url: /news
              - label: Dashboard
                url: /dashboard
```

**Rationale:** The user works only with technology-neutral JSON files (`data-model.json`, `data.json`). The skill handles the transformation to the target technology format. This keeps the planning layer portable — switching from Drupal to React only changes the story generator, not the data.

### 9. Indexer Extension via Design-Aware Glob

**Decision:** Extend the existing Storybook indexer rather than creating a separate addon.

**Changes to `preset.ts`:**

```typescript
// Add design glob alongside sections
const designGlob = resolve(projectRoot, distDir, 'design/**/*.component.yml');
return [...entry, onboardingGlob, sectionsGlob, designGlob];
```

**New indexer for design components:**

```typescript
const designIndexer = {
  test: /design\/.*\.component\.yml$/,
  createIndex: async (fileName: string) => {
    const content = readFileSync(fileName, 'utf-8');
    const component = parseYaml(content);
    
    // Derive sidebar path from directory structure
    // design/shell/header/shell_header.component.yml → Design/Shell/Header
    // design/entity/node/article/entity_node_article.component.yml → Design/Entity/Node/Article
    const relativePath = relative(designbookDir, fileName);
    const parts = relativePath.split('/');
    // Remove 'design' prefix and filename, capitalize each part
    const titleParts = parts.slice(1, -1).map(p => 
      p.charAt(0).toUpperCase() + p.slice(1)
    );
    const title = `Design/${titleParts.join('/')}`;
    
    // ... create story index entries from .story.yml alongside
  }
};
```

**Rationale:** Keeps all Storybook integration in one addon. The directory-to-title mapping is deterministic and doesn't require configuration.

**Alternative considered:** Separate addon for design components. Rejected — adds complexity and would need coordination with existing addon for config sharing.

### 10. Three Atomic Skills

**Decision:** Split generation into 3 independent skills, each with its own trigger and input:

| Skill | Layer | Input | Output |
|-------|-------|-------|--------|
| `designbook-shell` | Shell | `sections/*.section.yml` | `design/shell/header/`, `design/shell/footer/` |
| `designbook-entity` | Entity | `data-model.json`, `data.json`, `screen-designs.md` | `design/entity/[type]/[bundle]/` |
| `designbook-screen` | Screen | `screen-designs.md` (requires shell + entity) | `design/sections/[id]/[page]/` |

**Orchestration:** The existing `debo-design-screen` workflow invokes all 3 in order: shell → entity → screen. Each skill can also be invoked independently.

**Rationale:** Different change triggers. Data model changes only need entity regeneration. Adding a section only needs shell (new nav item) + screen. This follows the established pattern of atomic skills composed by workflows.

Each skill delegates actual SDC file creation to `designbook-drupal-components` with the appropriate `outputDir` parameter.

## Risks / Trade-offs

### Component Path Override
**Risk:** `designbook-drupal-components` currently hardcodes output to `$DESIGNBOOK_DRUPAL_THEME/components/`. Design components go to `$DESIGNBOOK_DIST/design/`.
**Mitigation:** The skill passes the full output path directly when writing files, bypassing the default convention. May need to add an `outputDir` parameter to `designbook-drupal-components`.

### SDC Provider Naming
**Risk:** SDC components require a `provider` field. Design components under `$DESIGNBOOK_DIST/` are not in a Drupal theme, so the provider won't match.
**Mitigation:** Use a dedicated provider name like `designbook_design` for design-level components. These are for Storybook prototyping only, not Drupal runtime.

### Indexer Performance
**Risk:** Scanning `design/**/*.component.yml` recursively on every Storybook start could be slow with many components.
**Mitigation:** The glob is already restricted to `.component.yml` files. In practice, design components are few (10-30 max). No caching needed initially.

### Screen-Designs.md Parsing
**Risk:** The markdown format of `screen-designs.md` may be inconsistent, making automated component generation fragile.
**Mitigation:** Define a strict section format in the skill. If parsing fails, report which sections couldn't be parsed and ask the user to clarify.
