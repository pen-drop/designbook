# View-Mode Mapping via JSONata

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

## Requirement: Separate View-Mode Expression Files

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

### Naming Convention

Files follow `<entity_type>.<bundle>.<view_mode>.jsonata`:
- `node.article.full.jsonata`
- `node.article.teaser.jsonata`
- `block_content.contact_person.avatar.jsonata`

### Scenario: Expression file returns ComponentNode[]
- **GIVEN** `view-modes/node.article.teaser.jsonata` containing a JSONata expression
- **AND** the expression input is a single entity record from `data.yml`
- **WHEN** evaluated
- **THEN** it returns an array of `ComponentNode` objects: `[{ type, component, props, slots }]`

### Scenario: Field access uses JSONata path syntax
- **GIVEN** a record `{ "title": "Hello", "field_media": { "url": "/img.jpg" } }`
- **AND** the expression contains `field_media.url`
- **WHEN** evaluated against the record
- **THEN** it resolves to `"/img.jpg"`

### Scenario: Fallbacks and conditionals
- **GIVEN** the expression `field_media.alt ? field_media.alt : title`
- **AND** `field_media.alt` is `null`
- **WHEN** evaluated
- **THEN** it returns the value of `title`

### Scenario: String transformations
- **GIVEN** the expression `$substring(field_body, 0, 200) & "..."`
- **WHEN** evaluated against a record with a long `field_body`
- **THEN** it returns the first 200 characters plus ellipsis

---

## Requirement: Expression File Format

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

### Scenario: Nested entity references
- **GIVEN** a view-mode expression that outputs a node with `{ type: "entity", entity_type: "block_content", bundle: "contact_person", view_mode: "avatar" }`
- **WHEN** the resolver encounters this in the output
- **THEN** it recursively evaluates `block_content.contact_person.avatar.jsonata` against the referenced record

### Scenario: No `@config` block needed
- Unlike `jsonata-w` CLI usage, view-mode expressions do NOT need `@config` blocks
- Input is provided programmatically by the addon (not from a file)
- Output is consumed in-memory (not written to a file)

---

## Requirement: Data Model Simplification

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

### Scenario: Existing view_modes removed
- **GIVEN** a `data-model.yml` that previously contained `view_modes` with `mapping` arrays
- **WHEN** migrated to the new format
- **THEN** the `view_modes` property is removed
- **AND** equivalent `.jsonata` files are created in `view-modes/`

---

## Requirement: In-Memory JSONata Evaluation in Addon

The `entity/resolver.ts` SHALL use the `jsonata` library to evaluate view-mode expressions in-memory. No files are written.

### Scenario: Vite plugin loads expression at screen resolve time
- **GIVEN** a `screen.yml` referencing `entity: node.article, view_mode: teaser`
- **WHEN** the Vite plugin resolves this screen
- **THEN** it reads `view-modes/node.article.teaser.jsonata` from disk
- **AND** reads the entity record from `data.yml`
- **AND** evaluates `jsonata(expression).evaluate(record)`
- **AND** uses the resulting `ComponentNode[]` for rendering

### Scenario: Expression results are NOT persisted
- **WHEN** the addon evaluates a JSONata expression
- **THEN** the result exists only in memory
- **AND** no intermediate files are written to disk

### Scenario: jsonata library used directly
- The addon SHALL use the `jsonata` npm package directly for evaluation
- The `jsonata-w` CLI is NOT used at runtime — it is a development/CLI tool
- The `jsonata` library (same one `jsonata-w` uses internally) provides the `evaluate()` API

### Scenario: Expression caching
- **GIVEN** the same `.jsonata` file is referenced multiple times (e.g., multiple records of same view_mode)
- **WHEN** the addon evaluates expressions
- **THEN** the parsed expression is cached (compiled once, evaluated many times)

---

## Requirement: Pluggable Renderer Registry

The screen rendering pipeline SHALL use a registry of pluggable renderers. Each renderer declares what node types it handles and how to render them. The registry dispatches nodes to the first matching renderer by priority.

### Core Types

```typescript
/**
 * A single renderer that knows how to handle a specific node type.
 * Integrations provide these to extend the rendering pipeline.
 */
interface ScreenNodeRenderer {
  /** Human-readable name for debugging */
  name: string;
  /** Determine if this renderer handles the given node */
  appliesTo: (node: Record<string, unknown>) => boolean;
  /** Render the node to a code string (e.g. Twig call, JSX, HTML) */
  render: (node: Record<string, unknown>, context: RenderContext) => string;
  /** Higher priority = checked first. Default: 0 */
  priority?: number;
}

/**
 * Context passed to every renderer — provides access to metadata,
 * recursive rendering, and import tracking.
 */
interface RenderContext {
  // --- Recursive rendering ---
  /** Render a child node through the registry (for nested components) */
  renderNode: (node: Record<string, unknown>) => string;

  // --- Component imports ---
  /** Track a component import. Returns the JS variable name to use. */
  trackImport: (componentId: string, importPath: string) => string;
  /** Get the JS variable name for an already-tracked component */
  getVar: (componentId: string) => string;

  // --- Metadata ---
  /** Provider prefix (e.g. 'test_integration_drupal') — from addon options */
  provider?: string;
  /** Data model schema (fields, entity types) — from data-model.yml */
  dataModel: DataModel;
  /** Sample data records — from section data.yml */
  sampleData: SampleData;
  /** Path to the designbook dist directory */
  designbookDir: string;

  // --- JSONata ---
  /** Evaluate a JSONata expression against data. Cached compiled expressions. */
  evaluateExpression: (expressionPath: string, input: Record<string, unknown>) => unknown;
}
```

### RenderContext Metadata — Where it comes from

```
┌──────────────────────────────────────────────────────────────┐
│                   Metadata Flow                               │
│                                                               │
│  .storybook/main.js                                           │
│  ┌─────────────────────────┐                                  │
│  │ options.designbook:     │                                  │
│  │   provider: '...'       │──┐                               │
│  │   renderers: [...]      │  │                               │
│  └─────────────────────────┘  │                               │
│                               ▼                               │
│  preset.ts                                                    │
│  ┌─────────────────────────────────────┐                      │
│  │ Reads provider + renderers          │                      │
│  │ Passes to vite-plugin               │                      │
│  └────────────────┬────────────────────┘                      │
│                   ▼                                           │
│  vite-plugin.ts                                               │
│  ┌─────────────────────────────────────┐                      │
│  │ loadScreenYml():                    │                      │
│  │  1. Loads data-model.yml   ─────────│──▶ ctx.dataModel     │
│  │  2. Loads data.yml         ─────────│──▶ ctx.sampleData    │
│  │  3. provider from options  ─────────│──▶ ctx.provider      │
│  │  4. designbookDir          ─────────│──▶ ctx.designbookDir │
│  │  5. Creates expression cache ───────│──▶ ctx.evaluateExpr  │
│  │  6. Builds RenderContext            │                      │
│  │  7. Dispatches nodes to registry    │                      │
│  └─────────────────────────────────────┘                      │
└──────────────────────────────────────────────────────────────┘
```

### Renderer Presets per Framework

The addon exports pre-configured renderer sets per framework. Each preset includes the `entityJsonataRenderer` (framework-independent) plus framework-specific component renderers.

```typescript
// Addon exports — storybook-addon-designbook

// SDC/Drupal preset (Twig rendering)
export { sdcRenderers } from './renderer/presets/sdc';
// sdcRenderers = [entityJsonataRenderer, sdcComponentRenderer]

// React preset (future)
export { reactRenderers } from './renderer/presets/react';
// reactRenderers = [entityJsonataRenderer, reactComponentRenderer]

// Individual renderers for custom composition
export { entityJsonataRenderer } from './renderer/entity-renderer';
export { sdcComponentRenderer } from './renderer/sdc-renderer';
```

Preset structure:

```
┌─────────────────────────────────────────────────────────┐
│  Always included (framework-independent)                │
│  ├── entityJsonataRenderer (priority: -10)              │
│  └── fallbackRenderer (priority: -100)                  │
├─────────────────────────────────────────────────────────┤
│  Per Framework                                          │
│  ├── sdcComponentRenderer (Drupal/Twig, priority: -10)  │
│  ├── reactComponentRenderer (React, priority: -10)      │
│  └── vueComponentRenderer (Vue, priority: -10)          │
└─────────────────────────────────────────────────────────┘
```

### How Integrations Register Renderers

Integrations import a preset and optionally merge it with custom renderers in `.storybook/main.js`:

```js
// .storybook/main.js — Drupal integration
import { sdcRenderers } from 'storybook-addon-designbook/renderers/sdc';
import { createImageRenderer } from './renderers/image.js';
import { createMarkupRenderer } from './renderers/markup.js';

export default {
  addons: [
    {
      name: 'storybook-addon-designbook',
      options: {
        designbook: {
          provider: 'test_integration_drupal',
          renderers: [
            ...sdcRenderers,             // ← Built-in SDC preset (entity + sdc-component)
            createImageRenderer(),        // ← Integration-specific extras (priority: 0)
            createMarkupRenderer(),       // ← Integration-specific extras (priority: 0)
          ],
        },
      },
    },
  ],
};
```

If no `renderers` are provided, the addon falls back to `sdcRenderers` as default (backward compatibility).
```

### Scenario: Renderer registration merging
- **GIVEN** the addon provides built-in renderers (`component`, `entity`)
- **AND** the integration provides additional renderers via `options.designbook.renderers`
- **WHEN** the registry is initialized
- **THEN** integration renderers are merged with built-in renderers
- **AND** all renderers are sorted by priority (highest first)
- **AND** built-in renderers have low priority (e.g. -10) so integrations can override them

### Scenario: Integration overrides built-in renderer
- **GIVEN** the integration provides a renderer with `appliesTo: (node) => node.type === 'component'` and `priority: 10`
- **WHEN** the registry processes a component node
- **THEN** the integration renderer handles it (priority 10 > built-in -10)

---

## Requirement: Built-in Renderers

The addon SHALL provide two built-in renderers. They can be overridden by integrations.

### Built-in: Component Renderer (SDC)

Handles `{ type: "component" }` nodes — generates Twig/SDC component calls.

```typescript
const sdcComponentRenderer: ScreenNodeRenderer = {
  name: 'sdc-component',
  priority: -10,
  appliesTo: (node) => node.type === 'component' && typeof node.component === 'string',
  render: (node, ctx) => {
    // Apply provider prefix
    const fullId = ctx.provider
      ? `${ctx.provider}:${node.component}`
      : node.component as string;

    // Track import for this component
    const varName = ctx.trackImport(fullId, resolveComponentPath(fullId, ctx.designbookDir));

    // Build args: merge props + rendered slots
    const args = buildArgs(node, ctx);

    // Generate SDC Twig call
    return `${varName}.default.component({...${varName}?.Basic?.baseArgs ?? {}, ${args}})`;
  },
};
```

#### Scenario: Provider prefix applied
- **GIVEN** `ctx.provider = 'test_integration_drupal'` and `node.component = 'heading'`
- **THEN** the full component ID is `'test_integration_drupal:heading'`
- **AND** the import resolves the component by searching `components/heading/heading.component.yml`

#### Scenario: Slot values with nested components
- **GIVEN** a slot value that is an array of `ComponentNode[]`
- **WHEN** the renderer processes the slot
- **THEN** it recursively calls `ctx.renderNode()` for each nested node
- **AND** wraps the results in a `TwigSafeArray`

### Built-in: Entity Renderer (JSONata)

Handles `{ type: "entity" }` nodes — loads `.jsonata` expression, evaluates against record, recursively renders output.

```typescript
const entityRenderer: ScreenNodeRenderer = {
  name: 'entity-jsonata',
  priority: -10,
  appliesTo: (node) => node.type === 'entity' && typeof node.entity_type === 'string',
  render: (node, ctx) => {
    const { entity_type, bundle, view_mode, record = 0 } = node as EntityNode;

    // 1. Load the entity record from sample data
    const records = ctx.sampleData[entity_type as string]?.[bundle as string];
    if (!records?.[record as number]) {
      return `/* [entity: ${entity_type}.${bundle} record ${record} — no sample data] */`;
    }
    const entityRecord = records[record as number];

    // 2. Load + evaluate the JSONata expression
    const exprPath = `view-modes/${entity_type}.${bundle}.${view_mode}.jsonata`;
    const componentNodes = ctx.evaluateExpression(
      resolve(ctx.designbookDir, exprPath),
      entityRecord
    ) as Record<string, unknown>[];

    // 3. Recursively render each resulting ComponentNode
    return componentNodes
      .map((child) => ctx.renderNode(child))
      .join('\n');
  },
};
```

#### Scenario: Entity renderer accesses sample data from context
- **GIVEN** `ctx.sampleData` contains `{ node: { article: [{ title: "Hello", ... }] } }`
- **AND** the node specifies `entity_type: "node", bundle: "article", record: 0`
- **WHEN** the entity renderer runs
- **THEN** it retrieves record `ctx.sampleData.node.article[0]`

#### Scenario: Entity renderer uses data-model for validation
- **GIVEN** `ctx.dataModel` has field definitions for `node.article`
- **WHEN** the entity renderer evaluates the JSONata expression
- **THEN** it can optionally validate that the expression output references valid component names
- **AND** log warnings for missing components

#### Scenario: Expression result contains nested entity nodes
- **GIVEN** the JSONata expression outputs `[{ type: "component", ... }, { type: "entity", entity_type: "block_content", ... }]`
- **WHEN** the entity renderer processes the output
- **THEN** it calls `ctx.renderNode()` for each item
- **AND** the nested `type: "entity"` node is dispatched back to the entity renderer recursively

---

## Requirement: Integration-Provided Renderers

Integrations MAY provide custom renderers for node types beyond `component` and `entity`.

### Example: Image Renderer

```typescript
// .storybook/renderers/image.js
export function createImageRenderer() {
  return {
    name: 'image',
    priority: 0,
    appliesTo: (node) => node.type === 'image' || node.theme === 'image',
    render: (node, ctx) => {
      const src = node.uri || node.src;
      const alt = node.alt || '';
      return JSON.stringify(`<img src="${src}" alt="${alt}" />`);
    },
  };
}
```

### Example: Markup Renderer

```typescript
// .storybook/renderers/markup.js
export function createMarkupRenderer() {
  return {
    name: 'markup',
    priority: 0,
    appliesTo: (node) => node.type === 'markup',
    render: (node) => JSON.stringify(node.markup || ''),
  };
}
```

### Example: Integration renderer that uses metadata

```typescript
// .storybook/renderers/field-debug.js
// A debug renderer that shows field definitions from data-model
export function createFieldDebugRenderer() {
  return {
    name: 'field-debug',
    priority: 100,  // High priority — catches entity nodes before default
    appliesTo: (node) => node.type === 'entity' && node.debug === true,
    render: (node, ctx) => {
      const { entity_type, bundle } = node;
      // Access data-model metadata from context
      const fields = ctx.dataModel.content?.[entity_type]?.[bundle]?.fields || {};
      const fieldList = Object.entries(fields)
        .map(([name, def]) => `${name}: ${def.type}`)
        .join(', ');
      return JSON.stringify(
        `<pre>[Debug: ${entity_type}.${bundle}] Fields: ${fieldList}</pre>`
      );
    },
  };
}
```

### Scenario: Custom renderer accesses dataModel
- **GIVEN** an integration renderer that needs field type information
- **WHEN** it receives `ctx.dataModel`
- **THEN** it can read `ctx.dataModel.content[entity_type][bundle].fields`
- **AND** use field metadata (type, required, target) for rendering decisions

### Scenario: Custom renderer accesses sampleData
- **GIVEN** an integration renderer that needs to look up related entities
- **WHEN** it receives `ctx.sampleData`
- **THEN** it can read any entity record: `ctx.sampleData[entity_type][bundle][recordIndex]`

### Scenario: Custom renderer uses provider
- **GIVEN** `ctx.provider = 'test_integration_drupal'`
- **THEN** integration renderers can use it to resolve component paths or apply namespace prefixes

---

## Requirement: Renderer Registry Service

The addon SHALL implement a `ScreenNodeRenderService` that manages the renderer lifecycle.

```typescript
class ScreenNodeRenderService {
  private renderers: ScreenNodeRenderer[] = [];

  /** Register renderers (sorted by priority, highest first) */
  register(renderers: ScreenNodeRenderer[]): void;

  /** Render a node by finding the first matching renderer */
  render(node: Record<string, unknown>, context: RenderContext): string;

  /** List all registered renderer names (for debugging) */
  list(): string[];
}
```

### Scenario: No matching renderer
- **GIVEN** a node with `{ type: "unknown_custom_type" }`
- **AND** no registered renderer matches
- **WHEN** `render()` is called
- **THEN** it returns `/* [no renderer for node: {"type":"unknown_custom_type"}] */`
- **AND** logs a warning to console

### Scenario: Priority ordering
- **GIVEN** renderers with priorities `[-10, 0, 5, 100]`
- **WHEN** the registry checks for a matching renderer
- **THEN** it checks priority `100` first, then `5`, then `0`, then `-10`

### Scenario: Renderer debugging
- **WHEN** `DESIGNBOOK_DEBUG=true`
- **THEN** the registry logs which renderer handled each node: `[Designbook] Renderer 'sdc-component' handled node type 'component'`

---

## Requirement: HMR Support

### Scenario: Expression file change triggers reload
- **GIVEN** `view-modes/node.article.teaser.jsonata` is modified
- **WHEN** the Vite dev server detects the change
- **THEN** all screens that reference `entity: node.article, view_mode: teaser` are reloaded

### Scenario: Data file change triggers reload
- **GIVEN** `sections/blog/data.yml` is modified
- **WHEN** the Vite dev server detects the change
- **THEN** all screens in the `blog` section are reloaded
- (This behavior already exists)

---

## Migration

| Before | After |
|--------|-------|
| `data-model.yml` with `view_modes.mapping` | `data-model.yml` (schema only) + `view-modes/*.jsonata` |
| `$field_name` custom syntax | JSONata path syntax (`field_name`) |
| `resolveValue()` custom interpreter | `jsonata(expr).evaluate(record)` |
| Hardcoded `renderNode()` in vite-plugin | Pluggable `ScreenNodeRenderer[]` registry |
| `isEntityRef()` check in resolver | Entity renderer in registry |

## Dependencies

| Package | Purpose | Size |
|---------|---------|------|
| `jsonata` | Expression evaluation (runtime) | ~130KB |
| `jsonata-w` | CLI for testing expressions (dev only) | Already installed |

## What Becomes Obsolete

| Component | Status |
|-----------|--------|
| `data-model.yml` `view_modes` section | **Removed** — replaced by `.jsonata` files |
| `entity/resolver.ts` `resolveValue()` | **Removed** — replaced by `jsonata().evaluate()` |
| `$field_name` micro-syntax | **Removed** — replaced by JSONata path syntax |
| `vite-plugin.ts` `renderNode()` | **Extracted** — into SDC renderer in registry |
| `entity/resolver.ts` `resolveMapping()` | **Removed** — JSONata expression returns full ComponentNode |

---

## Verification Plan

All new addon code is pure Node.js logic (no DOM, no browser). Vitest is the primary test runner.

### Vitest Configuration

The addon SHALL include a `vitest.config.ts`:

```typescript
// packages/storybook-addon-designbook/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
```

### Test Layer 1: Renderer Registry Unit Tests

Tests for `ScreenNodeRenderService` — dispatching, priority, fallback.

```
src/renderer/__tests__/render-service.test.ts
```

| Test Case | What is verified |
|-----------|-----------------|
| Dispatches to matching renderer | `appliesTo: (n) => n.type === 'test'` → render called |
| Respects priority ordering | Higher priority renderer is called first |
| Falls back for unknown nodes | Returns placeholder comment |
| Merges built-in + integration renderers | Integration renderers added alongside built-ins |
| Integration overrides built-in | Priority 10 beats built-in -10 |
| Debug logging when enabled | Console output with renderer name + node type |

### Test Layer 2: Entity Renderer Integration Tests

Tests that the entity renderer loads `.jsonata` files, evaluates against records, and produces `ComponentNode[]`.

```
src/renderer/__tests__/entity-renderer.test.ts
src/renderer/__tests__/fixtures/
  ├── view-modes/node.article.teaser.jsonata
  ├── data-model.yml
  └── data.yml
```

| Test Case | What is verified |
|-----------|-----------------|
| Evaluates JSONata against entity record | Correct props/slots resolved |
| Expression caching | Same file compiled only once |
| Missing `.jsonata` file | Returns placeholder, no crash |
| Missing sample data record | Returns placeholder, no crash |
| Nested entity in expression output | Recursive rendering via `ctx.renderNode()` |
| Provider prefix applied to components | `heading` → `test_integration_drupal:heading` |

### Test Layer 3: JSONata Expression Tests

`.jsonata` files can be tested in isolation using `jsonata-w` CLI — no Storybook needed.

```bash
# Inspect expression output against sample data
npx jsonata-w inspect view-modes/node.article.teaser.jsonata \
  --input sections/blog/data.yml

# Full transform with validation
npx jsonata-w transform view-modes/node.article.teaser.jsonata \
  --input sections/blog/data.yml
```

Or as Vitest tests using the `jsonata` library directly:

```
src/renderer/__tests__/expressions.test.ts
```

```typescript
import jsonata from 'jsonata';
import { readFileSync } from 'fs';

it('teaser expression produces correct ComponentNode[]', async () => {
  const expr = readFileSync('fixtures/view-modes/node.article.teaser.jsonata', 'utf-8');
  const record = { title: 'Hello', field_media: { url: '/img.jpg', alt: 'Photo' } };
  const result = await jsonata(expr).evaluate(record);

  expect(result).toEqual([
    { type: 'component', component: 'figure', props: { src: '/img.jpg', alt: 'Photo' } },
    { type: 'component', component: 'heading', props: { level: 'h3' }, slots: { text: 'Hello' } },
    // ...
  ]);
});
```

### Test Layer 4: Storybook Build (Smoke Test)

Validates that the full pipeline works end-to-end:

```bash
cd packages/integrations/test-integration-drupal
npm run build-storybook
```

This verifies:
- `.screen.yml` files are discovered by the indexer
- Entity entries resolved against data model + sample data
- `.jsonata` files loaded and evaluated successfully
- Renderer registry produces valid CSF module code
- No Storybook/Vite build errors

### Existing Tests to Update

The existing `resolver.test.ts` tests MUST be migrated:

- Current tests use `dataModel.view_modes.mapping` with `$field_name` syntax
- New tests must use `.jsonata` fixture files instead
- Test assertions remain the same (resolved `ComponentNode[]` structure)

---

## Skill Impact Analysis

### `designbook-data-model` — MAJOR changes required

| File | Impact | Required Changes |
|------|--------|-----------------|
| [SKILL.md](file:///home/cw/projects/designbook/.agent/skills/designbook-data-model/SKILL.md) | **Heavy** | Remove "View Mode Mappings" section (L44–98): `$field_name` syntax, mapping entry structure, nested entity refs, field-to-component mapping guide. Replace with reference to `view-modes/*.jsonata` files and the `designbook-screen` skill |
| [data-model.schema.yml](file:///home/cw/projects/designbook/.agent/skills/designbook-data-model/schema/data-model.schema.yml) | **Heavy** | Remove `view_modes` property from `bundle` definition (L47–52), remove `view_mode` definition (L54–67), remove `mapping_entry` definition (L68–88). Schema becomes fields-only |
| [process-data-model.md](file:///home/cw/projects/designbook/.agent/skills/designbook-data-model/steps/process-data-model.md) | **Minor** | No changes needed — validation step works the same, just schema validates less |
| Description (frontmatter) | **Minor** | Remove "Includes entity display mappings (view_modes) with $field_name resolution and nested entity refs" |

### `designbook-screen` — MODERATE changes required

| File | Impact | Required Changes |
|------|--------|-----------------|
| [SKILL.md](file:///home/cw/projects/designbook/.agent/skills/designbook-screen/SKILL.md) L20 | **Minor** | Prerequisites: Change "Data model with view mode mappings" → "Data model + view-mode JSONata files in `view-modes/`" |
| [SKILL.md](file:///home/cw/projects/designbook/.agent/skills/designbook-screen/SKILL.md) L115-116 | **Moderate** | Step 2: Change `content.[entity_type].[bundle].view_modes.[mode].mapping` → Check for `view-modes/{entity_type}.{bundle}.{mode}.jsonata` file |
| [SKILL.md](file:///home/cw/projects/designbook/.agent/skills/designbook-screen/SKILL.md) L204 | **Minor** | Error Handling: Change "View mode not defined → Add view mode mapping to data model" → "View mode not defined → Create `view-modes/{entity_type}.{bundle}.{mode}.jsonata`" |
| Description (frontmatter) | **Minor** | Change "build-time entity resolution" → "build-time entity resolution via JSONata" |

### NEW: `designbook-view-modes` — Potential new skill

A new skill MAY be needed for authoring view-mode `.jsonata` files:

| Responsibility | Description |
|---------------|-------------|
| Input | Entity type, bundle, view mode name, available fields from data-model |
| Output | `view-modes/{entity_type}.{bundle}.{mode}.jsonata` file |
| Validation | `jsonata-w inspect` against sample data |
| Guide | Field-to-component mapping guide (currently in data-model skill L89–98) |

This skill would move the "field-to-component mapping guide" from `designbook-data-model` to the new skill, because it's now about **JSONata expression authoring**, not data model definition.
## Requirements
### Requirement: List view-mode JSONata files

The view-modes directory SHALL support list-level JSONata files alongside entity-level files. List JSONata files follow the naming convention `list.<name>.<view_mode>.jsonata`.

```
view-modes/
├── node.article.teaser.jsonata            # entity view mode (existing)
├── list.recent_articles.default.jsonata   # list view mode (new)
└── list.search.default.jsonata            # list view mode (new)
```

#### Scenario: List JSONata file naming

- **WHEN** a list named `recent_articles` has a `default` view mode
- **THEN** the expression file SHALL be located at `view-modes/list.recent_articles.default.jsonata`

#### Scenario: Multiple list view modes

- **WHEN** a list named `recent_articles` has both `default` and `compact` view modes
- **THEN** two files SHALL exist: `list.recent_articles.default.jsonata` and `list.recent_articles.compact.jsonata`

### Requirement: List JSONata receives pre-rendered rows

List JSONata expressions SHALL receive pre-rendered item data as bound variables, NOT raw entity records. The renderer SHALL bind the following variables before evaluation:

| Variable | Type | Description |
|----------|------|-------------|
| `$rows` | `SceneNode[][]` | Array of rendered items — each entry is the `SceneNode[]` output from one record's entity view-mode JSONata |
| `$count` | `number` | Total number of records across all sources |
| `$limit` | `number` | Limit from list config (or total count if no limit) |

#### Scenario: List JSONata accesses $rows

- **WHEN** a list JSONata expression references `$rows`
- **THEN** it SHALL receive an array where each element is the rendered SceneNode array for one record
- **AND** records from all sources SHALL be included in source order

#### Scenario: List JSONata accesses $count and $limit

- **WHEN** a list has 25 total records and `limit: 10`
- **THEN** `$count` SHALL be `25`
- **AND** `$limit` SHALL be `10`
- **AND** `$rows` SHALL contain 10 entries (the first 10 records)

#### Scenario: List JSONata returns SceneNode

- **WHEN** a list JSONata expression is evaluated
- **THEN** it SHALL return a single `SceneNode` (typically a component wrapping the rows)
- **AND** the returned node SHALL be recursively rendered by the renderer

#### Scenario: List JSONata composes wrapper components

- **WHEN** a list JSONata expression defines a view component with grid and pager slots
- **THEN** the expression SHALL use `$rows` in the content slot and component references for pager, title, etc.
- **AND** example:
```jsonata
{
  "type": "component",
  "component": "provider:view",
  "slots": {
    "content": {
      "type": "component",
      "component": "provider:grid",
      "props": { "columns": 3 },
      "slots": { "items": $rows }
    },
    "pager": {
      "type": "component",
      "component": "provider:pager",
      "props": { "total": $count, "limit": $limit }
    }
  }
}
```


---

## Requirement: View-Mode Skill Colocation
View-mode authoring knowledge SHALL be part of the `designbook-scenes` skill. There SHALL be no separate `designbook-view-modes` skill.

When an agent creates scenes that require view-mode expressions, it SHALL find all necessary guidance (JSONata reference, field-mapping guide, create-view-modes task) within `designbook-scenes`.

#### Scenario: Agent creates scenes with view modes
- **WHEN** an agent loads `designbook-scenes` to build a scene
- **THEN** the skill contains all resources needed to also author the required `.jsonata` view-mode files without loading a second skill
