## Context

The addon generates CSF story modules from `*.scenes.yml` via a Vite plugin. The build pipeline resolves SceneNodes (entity, scene-ref, component) into flat `ComponentNode[]` via a `BuilderRegistry`. Currently all origin information is discarded after resolution — the pipeline goes directly from YAML to render-ready output.

The Drupal entity rendering model provides the right analogy: `entity->build()` produces a structured render array (intermediate), then `entity->view()` renders it to HTML. The current pipeline skips the intermediate step.

The addon registers UI in two Storybook extension points: manager (panels, tools) and preview (decorators). Communication between preview (Canvas iframe) and manager (panel) uses Storybook's channel API.

`types.TAB` is deprecated in Storybook 11 — all new UI uses `types.PANEL` and `types.TOOL`.

## Goals / Non-Goals

**Goals:**
- Two-phase build model: `build()` → SceneTree → `view()` → RenderTree
- SceneTree as the canonical intermediate representation carrying origin metadata
- Toolbar inspect toggle with canvas overlay showing scene node boundaries
- Panel showing composition tree and per-node mapping detail
- `MappingDetail` component reusable in data-model views

**Non-Goals:**
- Editing scenes from the panel
- Showing component internals beyond what the mapping reveals
- Navigation/flow between scenes (separate concern)
- Visual compare / screenshots (separate change: visual-compare-panel)
- Backwards compatibility for the builder interface change

## Decisions

### Decision 1: SceneTreeNode data model

```ts
interface SceneTreeNode {
  kind: 'component' | 'entity' | 'scene-ref' | 'string';

  // Kind-specific origin data
  component: string;                    // resolved component ID (all kinds except string)
  entity?: {                            // only for kind: 'entity'
    entity_type: string;
    bundle: string;
    view_mode: string;
    record?: number;
    mapping: string;                    // path to .jsonata file
  };
  ref?: {                               // only for kind: 'scene-ref'
    source: string;                     // "shared:footer"
    with?: Record<string, unknown>;
  };
  value?: string;                       // only for kind: 'string'

  // Resolved output
  props?: Record<string, unknown>;
  slots?: Record<string, SceneTreeNode[]>;
}
```

Each node carries its `kind` (what it was in the YAML) plus the resolved component and props/slots. The tree mirrors the full nesting structure including slots — it IS the scene, annotated.

### Decision 2: Two-phase build model

```
*.scenes.yml
     │
     │  parse
     ▼
SceneNode[]              (raw YAML nodes)
     │
     │  build()          (BuilderRegistry + builders)
     ▼
SceneTreeNode[]          (SceneTree — annotated intermediate)
     │
     │  view()           (trivial projection)
     ▼
ComponentNode[]          (RenderTree — render-ready, unchanged)
```

`build()` is what the builders already do, but now they return origin metadata alongside resolved nodes. The registry assembles the full `SceneTreeNode[]` tree.

`view()` is a pure function that strips metadata: `SceneTreeNode → ComponentNode` by copying `component`, `props`, and recursively transforming `slots`.

### Decision 3: BuildResult replaces RawNode[] return

```ts
interface BuildResult {
  nodes: RawNode[];
  meta: SceneTreeNode['kind'] extends string ? {
    kind: SceneTreeNode['kind'];
    entity?: SceneTreeNode['entity'];
    ref?: SceneTreeNode['ref'];
  } : never;
}
```

Simplified — each builder returns:

- `EntityBuilder`: `{ nodes, meta: { kind: 'entity', entity: { entity_type, bundle, view_mode, record, mapping } } }`
- `SceneBuilder`: `{ nodes, meta: { kind: 'scene-ref', ref: { source, with } } }`
- `ComponentBuilder`: `{ nodes, meta: { kind: 'component' } }`

`meta` is required. No optional, no fallback. Breaking change to the builder interface.

### Decision 4: SceneTree emitted as story parameter

```ts
export const MyScene = {
  args: {
    __scene: [...],           // RenderTree (ComponentNode[]) — for renderer
  },
  parameters: {
    sceneTree: [...],         // SceneTree (SceneTreeNode[]) — for panel
  },
  render: (args) => renderComponent(args.__scene, __imports),
};
```

SceneTree goes into `parameters.sceneTree`. The render function continues to use `args.__scene` unchanged. The panel reads `parameters.sceneTree` via `useParameter('sceneTree')`.

### Decision 5: Composition tree shows domain level only

The tree shows entities and scene-refs — not resolved components:

```
Scene: Homepage
 ├─ entity: menu/main (header)
 ├─ entity: node/landing_page (full)
 ├─ entity: node/landing_page (teaser) x3
 ├─ scene: shared:footer
 │   └─ entity: config/site
 └─ entity: menu/footer
```

Pure component nodes (no entity origin) are shown but de-emphasized. The tree answers "what data is on this page?" not "what components render it?"

Click on any node → panel switches to mapping detail view.

### Decision 6: Inspect overlay via decorator

A preview decorator wraps the story render output. When inspect mode is active:

1. Walks `parameters.sceneTree` to know the top-level node count and kinds
2. Wraps each top-level rendered element with a positioned outline div
3. Colors by kind: grey (component), blue (entity), green (scene-ref)
4. Shows label on hover (node name + kind)
5. On click: emits `designbook/select-node` channel event with node index

**Limitation:** Overlay only outlines top-level nodes. Slot-level inspection works through the tree in the panel.

### Decision 7: Channel communication

```
Toolbar (Manager)
  ── toggle ──▶ Channel: "designbook/inspect-mode" (boolean)
                    │
                    ▼
Decorator (Preview)              Panel (Manager)
  listens, shows/hides overlay   listens, shows/hides inspect UI
  │
  ── click ──▶ Channel: "designbook/select-node"
               { index: 1 }
                    │
                    ▼
               Panel shows MappingDetail for sceneTree[1]
```

### Decision 8: MappingDetail as standalone component

`MappingDetail` receives a single `SceneTreeNode` and renders based on `kind`:

- **entity**: data source fields (left) → connecting lines → resolved component props/slots (right), mapping file path as header
- **scene-ref**: referenced scene name, `with` variables, resolved output
- **component**: component name with props/slots directly (no mapping column)

The component only needs a `SceneTreeNode` — no scene context, no Storybook APIs. Reusable anywhere: scene panel, data-model page, future tooling.

### Decision 9: view() as pure function

```ts
function view(tree: SceneTreeNode[]): ComponentNode[] {
  return tree.map(node => ({
    component: node.component,
    props: node.props,
    slots: node.slots
      ? Object.fromEntries(
          Object.entries(node.slots).map(([k, v]) => [k, view(v)])
        )
      : undefined,
  }));
}
```

Trivial, pure, testable. No side effects, no async. This replaces the current direct ComponentNode[] output from the registry — the registry now produces SceneTree, and `view()` converts it.

## Risks / Trade-offs

- **[Build output size]** → `parameters.sceneTree` adds JSON to every story. Mitigation: only includes origin metadata + resolved component/props, same data volume as `__scene` plus kind annotations.
- **[Breaking builder interface]** → All three built-in builders change, any custom builders must adapt. Acceptable — no known external consumers, and the change is straightforward (wrap return value).
- **[Overlay accuracy]** → Canvas overlay can only reliably outline top-level nodes. Nested slot inspection is tree-only. Acceptable trade-off.
