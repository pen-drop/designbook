# Scene Renderer

> Introduces `*.scenes.yml` as a standalone file format with its own Storybook indexer and adapter-based rendering, replacing the destructive entity preprocessor approach.

> [!IMPORTANT]
> **Supersedes** the `entity-type-renderer` spec (Phase 2). The core resolver (`resolver.ts`) remains; the preprocessor and `type: entity` in `.story.yml` files are removed.

## Background

The current entity rendering pipeline has a fundamental flaw: it **overwrites story files on disk** to transform `type: entity` nodes into `type: component` nodes before SDC reads them. This is destructive, pollutes `git diff`, and loses the entity semantics.

The root cause: SDC uses `readFileSync` and cannot be intercepted via Vite's module system.

**Solution:** Don't go through SDC's pipeline at all. Introduce `*.scenes.yml` as a new file format with its own indexer and rendering adapter.

---

## Architecture

```
*.story.yml   ──→ SDC Indexer     ──→ SDC Renderer (Twig)
(UI components)   (unchanged)

*.scenes.yml  ──→ Designbook      ──→ Adapter
(screens)         Indexer              ├── SDC Adapter (Twig)
                  ├── resolver.ts      ├── React Adapter (JSX)
                  ├── data-model.yml  └── Vue Adapter (SFC)
                  └── data.yml
```

---

## Requirement: Screen File Format (`*.scenes.yml`)

A new YAML format for screen definitions. Framework-agnostic — describes WHAT is rendered, not HOW.

### Schema

```yaml
name: <string>           # Display name  
section: <string>        # Section ID (maps to data.yml location)

layout:
  <slot_name>:           # e.g. header, content, footer
    - component: <name>  # UI component (without provider prefix)
      props: { ... }
      slots: { ... }
    - entity: <entity_type>.<bundle>
      view_mode: <mode>
      record: <int>      # single record
      records: [0, 1, 2] # OR multiple records (shorthand)
```

### Scenario: Entity shorthand
- **GIVEN** `entity: node.article` with `records: [0, 1, 2]`
- **THEN** the resolver expands this to 3 resolved component groups
- **AND** each group uses the `view_mode` mapping from `data-model.yml`

### Scenario: Component nodes pass through
- **GIVEN** `component: heading` with `props: { level: h1 }`
- **THEN** the adapter renders it directly (like SDC does for `.story.yml`)

### Scenario: Nested entity refs in slots
- **GIVEN** a `view_modes` mapping entry with a slot containing `{type: entity, ...}`
- **THEN** the resolver resolves it recursively using the referenced entity's `view_modes`

### Scenario: Mixed content
- **GIVEN** a layout slot with both `component:` and `entity:` entries
- **THEN** they render in array order, component entries rendered directly, entity entries resolved first

---

## Requirement: Storybook Indexer

The `storybook-addon-designbook` SHALL register a Storybook indexer that discovers `*.scenes.yml` files and generates CSF story entries.

### Scenario: File discovery
- **GIVEN** a project with `section-blog.listing.scenes.yml` and `section-blog.detail.scenes.yml`
- **THEN** the indexer creates two story entries under the section's group
- **AND** story IDs are derived from filename: `section-blog--listing`, `section-blog--detail`

### Scenario: No collision with SDC
- **GIVEN** both `*.story.yml` and `*.scenes.yml` files in the same directory
- **THEN** SDC indexes only `.story.yml`, Designbook indexes only `.scenes.yml`
- **AND** they coexist without conflict

---

## Requirement: Screen Adapter Interface

Framework adapters translate resolved `ComponentNode[]` into rendered output.

```typescript
interface ScreenAdapter {
  /** Render a resolved ComponentNode to framework output */
  renderComponent(node: ComponentNode): unknown;
  
  /** Load/import a component by name */
  loadComponent(name: string): Promise<unknown>;
}
```

### Scenario: SDC Adapter (Twig)
- **GIVEN** the SDC adapter is configured
- **WHEN** it receives a `ComponentNode` with `component: "heading"`
- **THEN** it renders the Twig template for `heading.twig` with the resolved props/slots

### Scenario: React Adapter (future)
- **GIVEN** the React adapter is configured
- **WHEN** it receives a `ComponentNode` with `component: "heading"`
- **THEN** it imports and renders `<Heading />` with the resolved props

---

## Requirement: Configuration

The adapter and data paths are configured in `.storybook/main.js`:

```js
addons: [
  ['storybook-addon-designbook', {
    provider: 'daisy_cms_daisyui',
    adapter: 'sdc',           // or 'react', 'vue'
    dataModelPath: 'designbook/data-model.yml',
    sectionsPath: 'designbook/sections',
  }],
]
```

---

## What Becomes Obsolete

| Component | Status |
|-----------|--------|
| `entity/sdc-preprocessor.ts` | **Removed** — no file overwriting |
| `entity/resolver.ts` | **Kept** — used by indexer, not preprocessor |
| `entity/types.ts` | **Kept** — shared types |
| Vite `buildStart` hook | **Removed** — indexer replaces it |
| `*.story.yml` with `type: entity` | **Replaced** by `*.scenes.yml` |
| `.component.yml` for screens | **Replaced** — screens don't need SDC component defs |
| Screen `.twig` templates | **Replaced** — adapter handles rendering |

---

## Migration

| Before | After |
|--------|-------|
| `section-blog.detail.story.yml` | `section-blog.detail.scenes.yml` |
| `section-blog.component.yml` | _(removed)_ |
| `section-blog.twig` | _(removed)_ |
| `type: entity` in story YAML | `entity: node.article` in screen YAML |
| `type: component` with manual props | `component: heading` with same props |
