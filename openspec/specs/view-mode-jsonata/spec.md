# view-mode-jsonata Specification

> Extracts view-mode mappings from `data-model.yml` into separate `.jsonata` files. The addon evaluates them **in-memory** at Vite load time against entity records from `data.yml`. Introduces a pluggable Renderer Registry for framework-agnostic rendering.

> [!IMPORTANT]
> **Modifies** the `entity-type-renderer` and `screen-renderer` specs. The `data-model.yml` loses `view_modes.mapping` — it becomes a pure data schema. View-mode logic moves to JSONata expression files.

## Background

The current entity resolution pipeline embeds field-to-component mappings inside `data-model.yml` using a custom `$field_name` micro-syntax:

```yaml
# data-model.yml (current — mixed concerns)
content:
  node:
    article:
      fields:
        title: { type: string }
      view_modes:
        teaser:
          mapping:
            - component: card
              props:
                title: $title    # ← Custom syntax, limited
```

**Problems:**
1. **Mixed concerns** — data schema and display logic in one file
2. **Custom micro-syntax** — `$field_name` is a bespoke interpreter (~40 lines in `resolveValue()`) with no fallbacks, no conditionals, no transformations
3. **Untestable in isolation** — mapping can only be verified by running the full Storybook pipeline
4. **Hard to extend** — every new capability (conditional rendering, array iteration, string transforms) requires code changes to the resolver

**Solution:** Use JSONata — the same expression language already used for CSS token generation via `jsonata-w` — as the runtime mapping engine for view modes.

---

## Requirements

### Requirement: Separate View-Mode Expression Files

View-mode mappings SHALL be stored as `.jsonata` files in a `view-modes/` directory under `$DESIGNBOOK_DIST`:

```
designbook/
├── data-model.yml                        # Pure data schema (fields only)
├── view-modes/                           # NEW: mapping expressions
│   ├── node.article.full.jsonata
│   ├── node.article.teaser.jsonata
│   └── block_content.contact_person.avatar.jsonata
├── sections/blog/data.yml
└── sections/blog/blog.listing.screen.yml
```

#### Naming Convention

Files follow `<entity_type>.<bundle>.<view_mode>.jsonata`:
- `node.article.full.jsonata`
- `node.article.teaser.jsonata`
- `block_content.contact_person.avatar.jsonata`

#### Scenario: Expression file returns ComponentNode[]
- **GIVEN** `view-modes/node.article.teaser.jsonata` containing a JSONata expression
- **AND** the expression input is a single entity record from `data.yml`
- **WHEN** evaluated
- **THEN** it returns an array of `ComponentNode` objects: `[{ type, component, props, slots }]`

#### Scenario: Field access uses JSONata path syntax
- **GIVEN** a record `{ "title": "Hello", "field_media": { "url": "/img.jpg" } }`
- **AND** the expression contains `field_media.url`
- **WHEN** evaluated against the record
- **THEN** it resolves to `"/img.jpg"`

#### Scenario: Fallbacks and conditionals
- **GIVEN** the expression `field_media.alt ? field_media.alt : title`
- **AND** `field_media.alt` is `null`
- **WHEN** evaluated
- **THEN** it returns the value of `title`

#### Scenario: String transformations
- **GIVEN** the expression `$substring(field_body, 0, 200) & "..."`
- **WHEN** evaluated against a record with a long `field_body`
- **THEN** it returns the first 200 characters plus ellipsis

### Requirement: Expression File Format

Each `.jsonata` file is a pure JSONata expression that receives a single entity record as input and returns `ComponentNode[]`.

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

#### Scenario: Nested entity references
- **GIVEN** a view-mode expression that outputs a node with `{ type: "entity", entity_type: "block_content", bundle: "contact_person", view_mode: "avatar" }`
- **WHEN** the resolver encounters this in the output
- **THEN** it recursively evaluates `block_content.contact_person.avatar.jsonata` against the referenced record

#### Scenario: No `@config` block needed
- Unlike `jsonata-w` CLI usage, view-mode expressions do NOT need `@config` blocks
- Input is provided programmatically by the addon (not from a file)
- Output is consumed in-memory (not written to a file)

### Requirement: Data Model Simplification

The `data-model.yml` SHALL be simplified to a **pure data schema** — no `view_modes` property.

```yaml
# data-model.yml — ONLY data schema
content:
  node:
    article:
      title: Article
      description: Blog articles with text content and media
      fields:
        title:
          type: string
          required: true
        field_body:
          type: text
        field_media:
          type: reference
          target: media.image
        field_category:
          type: reference
          target: taxonomy_term.category
        field_teaser:
          type: string
```

#### Scenario: Existing view_modes removed
- **GIVEN** a `data-model.yml` that previously contained `view_modes` with `mapping` arrays
- **WHEN** migrated to the new format
- **THEN** the `view_modes` property is removed
- **AND** equivalent `.jsonata` files are created in `view-modes/`

### Requirement: In-Memory JSONata Evaluation in Addon

The `entity/resolver.ts` SHALL use the `jsonata` library to evaluate view-mode expressions in-memory. No files are written.

#### Scenario: Vite plugin loads expression at screen resolve time
- **GIVEN** a `screen.yml` referencing `entity: node.article, view_mode: teaser`
- **WHEN** the Vite plugin resolves this screen
- **THEN** it reads `view-modes/node.article.teaser.jsonata` from disk
- **AND** reads the entity record from `data.yml`
- **AND** evaluates `jsonata(expression).evaluate(record)`
- **AND** uses the resulting `ComponentNode[]` for rendering

#### Scenario: Expression results are NOT persisted
- **WHEN** the addon evaluates a JSONata expression
- **THEN** the result exists only in memory
- **AND** no intermediate files are written to disk

#### Scenario: jsonata library used directly
- The addon SHALL use the `jsonata` npm package directly for evaluation
- The `jsonata-w` CLI is NOT used at runtime — it is a development/CLI tool
- The `jsonata` library (same one `jsonata-w` uses internally) provides the `evaluate()` API

#### Scenario: Expression caching
- **GIVEN** the same `.jsonata` file is referenced multiple times (e.g., multiple records of same view_mode)
- **WHEN** the addon evaluates expressions
- **THEN** the parsed expression is cached (compiled once, evaluated many times)

### Requirement: Pluggable Renderer Registry

The screen rendering pipeline SHALL use a registry of pluggable renderers. Each renderer declares what node types it handles and how to render them. The registry dispatches nodes to the first matching renderer by priority.

#### Core Types

```typescript
interface ScreenNodeRenderer {
  name: string;
  appliesTo: (node: Record<string, unknown>) => boolean;
  render: (node: Record<string, unknown>, context: RenderContext) => string;
  priority?: number;
}

interface RenderContext {
  renderNode: (node: Record<string, unknown>) => string;
  trackImport: (componentId: string, importPath: string) => string;
  getVar: (componentId: string) => string;
  provider?: string;
  dataModel: DataModel;
  sampleData: SampleData;
  designbookDir: string;
  evaluateExpression: (expressionPath: string, input: Record<string, unknown>) => unknown;
}
```

#### Scenario: Renderer registration merging
- **GIVEN** the addon provides built-in renderers (`component`, `entity`)
- **AND** the integration provides additional renderers via `options.designbook.renderers`
- **WHEN** the registry is initialized
- **THEN** integration renderers are merged with built-in renderers
- **AND** all renderers are sorted by priority (highest first)
- **AND** built-in renderers have low priority (e.g. -10) so integrations can override them

#### Scenario: Integration overrides built-in renderer
- **GIVEN** the integration provides a renderer with `appliesTo: (node) => node.type === 'component'` and `priority: 10`
- **WHEN** the registry processes a component node
- **THEN** the integration renderer handles it (priority 10 > built-in -10)

### Requirement: Built-in Renderers

The addon SHALL provide two built-in renderers. They can be overridden by integrations.

#### Scenario: Provider prefix applied
- **GIVEN** `ctx.provider = 'daisy_cms_daisyui'` and `node.component = 'heading'`
- **THEN** the full component ID is `'daisy_cms_daisyui:heading'`
- **AND** the import resolves the component by searching `components/heading/heading.component.yml`

#### Scenario: Slot values with nested components
- **GIVEN** a slot value that is an array of `ComponentNode[]`
- **WHEN** the renderer processes the slot
- **THEN** it recursively calls `ctx.renderNode()` for each nested node

#### Scenario: Entity renderer accesses sample data from context
- **GIVEN** `ctx.sampleData` contains `{ node: { article: [{ title: "Hello", ... }] } }`
- **AND** the node specifies `entity_type: "node", bundle: "article", record: 0`
- **WHEN** the entity renderer runs
- **THEN** it retrieves record `ctx.sampleData.node.article[0]`

#### Scenario: Expression result contains nested entity nodes
- **GIVEN** the JSONata expression outputs `[{ type: "component", ... }, { type: "entity", entity_type: "block_content", ... }]`
- **WHEN** the entity renderer processes the output
- **THEN** it calls `ctx.renderNode()` for each item
- **AND** the nested `type: "entity"` node is dispatched back to the entity renderer recursively

### Requirement: Integration-Provided Renderers

Integrations MAY provide custom renderers for node types beyond `component` and `entity`.

#### Scenario: Custom renderer accesses dataModel
- **GIVEN** an integration renderer that needs field type information
- **WHEN** it receives `ctx.dataModel`
- **THEN** it can read `ctx.dataModel.content[entity_type][bundle].fields`

#### Scenario: Custom renderer accesses sampleData
- **GIVEN** an integration renderer that needs to look up related entities
- **WHEN** it receives `ctx.sampleData`
- **THEN** it can read any entity record: `ctx.sampleData[entity_type][bundle][recordIndex]`

### Requirement: Renderer Registry Service

The addon SHALL implement a `ScreenNodeRenderService` that manages the renderer lifecycle.

#### Scenario: No matching renderer
- **GIVEN** a node with `{ type: "unknown_custom_type" }`
- **AND** no registered renderer matches
- **WHEN** `render()` is called
- **THEN** it returns `/* [no renderer for node: {"type":"unknown_custom_type"}] */`

#### Scenario: Priority ordering
- **GIVEN** renderers with priorities `[-10, 0, 5, 100]`
- **WHEN** the registry checks for a matching renderer
- **THEN** it checks priority `100` first, then `5`, then `0`, then `-10`

### Requirement: HMR Support

#### Scenario: Expression file change triggers reload
- **GIVEN** `view-modes/node.article.teaser.jsonata` is modified
- **WHEN** the Vite dev server detects the change
- **THEN** all screens that reference `entity: node.article, view_mode: teaser` are reloaded

#### Scenario: Data file change triggers reload
- **GIVEN** `sections/blog/data.yml` is modified
- **WHEN** the Vite dev server detects the change
- **THEN** all screens in the `blog` section are reloaded
