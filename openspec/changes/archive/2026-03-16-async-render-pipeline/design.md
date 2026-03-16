## Context

The current pipeline conflates two concerns: building a component tree (data) and generating framework-specific code strings. This forces async JSONata evaluation into the rendering step, requiring a marker system (`__ENTITY_EXPR__`, `__LIST_EXPR__`) as a sync/async bridge. The marker resolver (~150 lines) must be re-implemented per framework adapter.

The root cause: `render()` is sync but JSONata is async. The fix: separate build time (async, data) from runtime (sync, rendering).

## Goals / Non-Goals

**Goals:**
- Builders produce `ComponentNode[]` data — async, framework-agnostic, pluggable via `appliesTo`
- CSF Prep generates the module string — sync, framework-agnostic
- Renderer traverses `ComponentNode[]` at runtime — sync, framework-agnostic
- Markers eliminated entirely
- React client-only components work (full lifecycle — useState, useEffect, etc.)
- Storybook Controls can modify `args.__scene`
- Builders are pluggable — custom `config_type`, custom node types

**Non-Goals:**
- Changing the YAML scene or data model format
- Server-side rendering of scenes
- Publishing separate packages per framework (co-located for now)

## Core Insight: Build Time vs Runtime

Everything async happens at build time. Runtime is sync.

```
BUILD TIME (Node.js, async):

  SceneNode[]
    │
    ▼ Builder registry (appliesTo dispatch)
    │
    ├─ EntityBuilder       appliesTo: type=entity
    │    └─ JSONata eval (async) → raw result (component + entity refs)
    │
    ├─ ConfigListBuilder   appliesTo: type=config, config_type=list
    │    └─ collect rows → JSONata eval (async) → raw result
    │
    ├─ SceneBuilder        appliesTo: type=scene
    │    └─ load referenced scene YAML → build slots → merge overrides
    │
    └─ (custom builders)
    │
    ▼ resolveEntityRefs() [registry, after every build()]
    │    → top-level entity refs → ctx.buildNode()
    │    → entity refs in slots  → ctx.buildNode()
    │
    ▼ ComponentNode[] tree (pure data, fully resolved)
    │
    ▼ CSF Prep (sync)
       → walk tree → collect component references → import statements
       → wrap as args.__scene
       → emit CSF module string


RUNTIME (Browser, sync):

  render(args)
    │
    ▼ renderComponent(args.__scene, __imports)
       → recursive traversal
       → slots resolved recursively
       → leaf: mod.render(props, slots)   ← only framework-specific point
```

## Interfaces

### Builder (build time, async)

```ts
interface SceneNodeBuilder {
  appliesTo(node: SceneNode): boolean;
  /** Returns raw result — may contain entity refs at top level or in slots */
  build(node: SceneNode, ctx: BuildContext): Promise<RawNode[]>;
}

type RawNode = ComponentNode | SceneNode;  // builder output, not yet fully resolved

interface BuildContext {
  dataModel: DataModel;
  sampleData: SampleData;
  designbookDir: string;
  /** Dispatch through registry + resolveEntityRefs — always returns clean ComponentNode[] */
  buildNode: (node: SceneNode) => Promise<ComponentNode[]>;
}
```

### Builder Registry — resolveEntityRefs

The registry owns entity ref resolution. After every `builder.build()` call, the registry walks the raw result and resolves any remaining entity refs — at top level and in slots. Builders do not need to walk their own output.

```ts
// builder-registry.ts
async function buildNode(node, ctx): Promise<ComponentNode[]> {
  const builder = findBuilder(node);
  const raw = await builder.build(node, ctx);
  return resolveEntityRefs(raw, ctx);        // ← shared, once, owned by registry
}

async function resolveEntityRefs(nodes: RawNode[], ctx): Promise<ComponentNode[]> {
  return Promise.all(nodes.flatMap(async node => {
    if (isSceneNode(node)) return ctx.buildNode(node);   // top-level entity/config ref
    return {
      ...node,
      slots: await resolveSlots(node.slots, ctx),        // entity refs in slots
    };
  }));
}
```

Builders implement only `build()`. `resolveEntityRefs` is a plain function — not on the interface, not a base class method — easily tested in isolation.

Built-in builders — registered automatically, can be overridden by priority:

| Builder | appliesTo |
|---|---|
| `EntityBuilder` | `type === 'entity'` |
| `ConfigListBuilder` | `type === 'config' && config_type === 'list'` |
| `SceneBuilder` | `type === 'scene'` |

### SceneBuilder

Enables scene composition — a slot entry can reference another scene, optionally overriding specific slots.

**YAML:**
```yaml
scenes:
  - name: WithArticle
    items:
      - type: scene
        ref: design-system:shell   # source:sceneName
        slots:
          content:
            - entity: node.article
              view_mode: teaser
```

`scenes[].items` is always a flat `SceneNode[]` — it behaves like a single root slot. There is no multi-slot at the root level. Multi-slot structure comes only from `type: scene` or `type: component` nodes that have their own `slots`.

**`build()` logic:**
1. Parse `ref` → find `<source>/*.scenes.yml`, locate scene by name
2. For each entry in referenced scene's `items`: `await ctx.buildNode()` → `ComponentNode[]`
3. For each slot override in `node.slots`: `await ctx.buildNode()` per entry → `ComponentNode[]`
4. Merge overrides into the referenced scene's built component tree
5. Return merged `ComponentNode[]`

`layout:` root-level key is **removed entirely**. `scenes[].items` replaces it everywhere.

### ComponentNode (the data contract between build and runtime)

```ts
interface ComponentNode {
  component: string;              // component reference key (e.g. 'test_provider:card')
  props?: Record<string, unknown>;
  slots?: Record<string, ComponentNode | ComponentNode[] | string>;
}
```

### CSF Prep (build time, sync)

```ts
interface CsfPrepOptions {
  group: string;
  source: string;
  scenes: Array<{
    name: string;
    exportName: string;
    nodes: ComponentNode[];        // fully resolved tree
  }>;
}

function buildCsfModule(opts: CsfPrepOptions): string;
// → walks tree, collects component refs, emits import statements + CSF exports
```

### Renderer (runtime, sync)

```ts
// framework-agnostic — one function, shipped with addon
function renderComponent(
  nodes: ComponentNode | ComponentNode[],
  imports: Record<string, ComponentModule>
): unknown;  // React element | HTML string | Vue vnode

interface ComponentModule {
  render(props: Record<string, unknown>, slots: Record<string, unknown>): unknown;
}
```

Framework-specific `render()` is implemented by each component module:

```ts
// SDC (.component.yml → Storybook SDC adapter):
{ render: (props, slots) => mod.default.component({ ...props, ...slots }) }

// React (.tsx):
{ render: (props, slots) => React.createElement(Component, { ...props, ...slots }) }

// Vue3 (.vue):
{ render: (props, slots) => h(Component, { ...props, ...slots }) }
```

## Generated CSF Module

The same module structure for all frameworks — only the component modules differ:

```js
import { renderComponent } from 'storybook-addon-designbook';
import * as Card   from './components/card/card.component.yml';   // SDC
import * as Badge  from './components/badge/badge.component.yml'; // SDC

const __imports = {
  'test_provider:card': Card,
  'test_provider:badge': Badge,
};

export default {
  title: 'Sections/Blog',
  tags: ['scene'],
  parameters: { layout: 'fullscreen', scene: { source: 'blog.scenes.yml' } },
};

export const Default = {
  args: {
    __scene: [
      {
        component: 'test_provider:card',
        props: { title: 'Understanding Modern Architecture' },
        slots: {
          author: {
            component: 'test_provider:badge',
            props: { label: 'Jane Doe' }
          }
        }
      }
    ]
  },
  render: (args) => renderComponent(args.__scene, __imports),
};
```

## Builder Recursion

EntityBuilder receives JSONata output that may contain entity refs. These are dispatched back through the builder registry:

```
EntityBuilder.build(node.article.with-author)
  → JSONata eval → [
      { type: 'component', component: 'heading', ... },
      { type: 'entity', entity_type: 'user', bundle: 'user', view_mode: 'compact' }
    ]
  → heading → pass through as ComponentNode
  → entity  → ctx.buildNode(entityNode) → EntityBuilder again
                → JSONata eval → [{ type: 'component', component: 'badge', ... }]
                → ComponentNode: badge
  → returns: [headingNode, badgeNode]
```

Natural recursion, terminates when no more entity refs in output.

## Test Fixtures

All fixtures live in `src/renderer/__tests__/fixtures/`.

### Existing fixtures

| File | What it tests |
|---|---|
| `view-modes/node.article.teaser.jsonata` | Entity → flat ComponentNode[] |
| `view-modes/node.article.with-author.jsonata` | Entity → mixed: component + entity ref (recursion) |
| `view-modes/user.user.compact.jsonata` | Entity → leaf ComponentNode |
| `view-modes/list.recent_articles.default.jsonata` | Config list → ComponentNode with `$rows` |

### Additions to existing fixtures

**`data.yml`** — add `user.user` records:
```yaml
node:
  article:
    - title: "Understanding Modern Architecture"
      field_body: "<p>Architecture has evolved...</p>"
      field_media:
        url: "/images/architecture-hero.jpg"
        alt: "Modern building with glass facade"
      field_teaser: "A deep dive into modern architecture."
user:
  user:
    - name: "Jane Doe"
      field_avatar: "/images/jane.jpg"
```

**`data-model.yml`** — add `user.user` + list config:
```yaml
content:
  node:
    article:
      fields:
        title: { type: string }
        field_body: { type: text }
        field_media: { type: reference }
        field_teaser: { type: string }
  user:
    user:
      fields:
        name: { type: string }
config:
  list:
    recent_articles:
      sources:
        - entity_type: node
          bundle: article
          view_mode: teaser
      limit: 10
```

### New fixture: `view-modes/node.article.card.jsonata`

Tests **component → slot → entity** — card whose `author` slot is an entity ref:

```json
[
  {
    "type": "component",
    "component": "card",
    "props": { "title": title },
    "slots": {
      "media": {
        "type": "component",
        "component": "figure",
        "props": { "src": field_media.url, "alt": field_media.alt }
      },
      "author": {
        "type": "entity",
        "entity_type": "user",
        "bundle": "user",
        "view_mode": "compact",
        "record": 0
      }
    }
  }
]
```

### New fixture: `shell.scenes.yml`

Shell scene — `items` contains a page component with named slots:

```yaml
group: Test/Shell

scenes:
  - name: shell
    items:
      - component: test_provider:page
        slots:
          header:
            - component: test_provider:nav
          content: []
          footer:
            - component: test_provider:footer
```

### New fixture: `test.scenes.yml`

```yaml
group: Test/Scenes

scenes:
  - name: Flat
    items:
      - entity: node.article
        view_mode: teaser
        record: 0

  - name: EntityInEntity
    items:
      - entity: node.article
        view_mode: with-author
        record: 0

  - name: EntityInComponentSlot
    items:
      - entity: node.article
        view_mode: card
        record: 0

  - name: ConfigList
    items:
      - config: list.recent_articles
        view_mode: default

  - name: ComponentDirect
    items:
      - component: test_provider:heading
        props: { level: h1 }
        slots: { text: Hello World }

  - name: WithShell
    items:
      - type: scene
        ref: test:shell
        slots:
          content:
            - entity: node.article
              view_mode: teaser
              record: 0
```

### Test coverage

| Scene | Build path | Assert on `ComponentNode[]` |
|---|---|---|
| `Flat` | entity → teaser jsonata | figure, heading, text-block nodes |
| `EntityInEntity` | entity → with-author jsonata → [heading, entity(user)] → resolveEntityRefs → compact jsonata → badge | heading + badge (entity ref at top level of JSONata output) |
| `EntityInComponentSlot` | entity → card jsonata → card component → resolveEntityRefs walks slots → entity(user) in author slot → compact jsonata → badge | card node with badge in `author` slot (entity ref inside component slot) |
| `ConfigList` | config → rows via entity builds → list jsonata → wrapper | view/grid wrapping article nodes |
| `ComponentDirect` | component passthrough | heading node with h1 prop |
| `WithShell` | scene ref → shell built (page+nav+footer) → content override built (article) → merged into page.content slot | page node with nav, article, footer |

`EntityInEntity` + `EntityInComponentSlot` together cover the full `entity → component → entity` chain: one resolves at the top level of JSONata output via `resolveEntityRefs`, one resolves inside a component slot via `resolveSlots`.

All builder tests: `await builder.build(node, ctx)` → assert `ComponentNode[]` structure.
All CSF tests: `buildCsfModule(...)` → assert module string shape, no markers.

## File Layout

```
src/renderer/
  types.ts                        ← SceneNodeBuilder, ComponentNode, BuildContext, RawNode
  builder-registry.ts             ← appliesTo dispatch, buildNode(), resolveEntityRefs()
  builders/
    entity-builder.ts             ← EntityBuilder (async, JSONata)
    config-list-builder.ts        ← ConfigListBuilder (async, JSONata)
    scene-builder.ts              ← SceneBuilder (async, loads + merges referenced scene)
  csf-prep.ts                     ← buildCsfModule() — import tracking + module string
  renderer.ts                     ← renderComponent() — runtime, sync, exported
  scene-module-builder.ts         ← orchestrates: registry + csf-prep
```

## Risks / Trade-offs

- **Breaking change** — `SceneNodeRenderer` interface replaced by `SceneNodeBuilder`. Custom renderers must be rewritten. Clean break, no shims.
- **ComponentModule.render() contract** — framework adapters must implement this interface. SDC's Storybook adapter already provides `mod.default.component()` — thin wrapper needed.
- **Import tracking** — CSF prep walks the ComponentNode tree to collect component refs. Component names must be consistent strings (e.g. `'test_provider:card'`) that map to import paths.
