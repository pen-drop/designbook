## Architecture

### Core principle: The renderer is always recursive

The renderer does NOT need to know about extensions, composition, or backend specifics. It has exactly one algorithm:

```
render(node):
  if node.type == "component":
    render the component
    for each slot value:
      if slot contains SceneNode[]:
        render(child) recursively
  if node.type == "entity":
    data = lookupSampleData(node)
    nodes = evaluateJSONata(node, data)  → SceneNode[]
    for each child in nodes:
      render(child) recursively
```

This handles all patterns. The difference between structured, layout_builder, and canvas is only **what the JSONata expressions produce** — and that's controlled by the skills, not the renderer.

### Two orthogonal axes

```
Config (global):    extensions: [layout_builder]
                    → Backend capabilities. Skills use this to decide
                      what questions to ask and what artifacts to generate.

Data Model (per bundle):  composition: structured | unstructured
                          → Does this bundle have fields with entity
                            references, or a component/layout tree?
```

### What composition means

`composition` is a per-bundle flag, but it only affects view_mode `full`. All other view modes (teaser, card, compact, etc.) are **always structured** — they render fields, not layout trees.

| composition    | view_mode `full`                     | All other view modes         |
|----------------|--------------------------------------|------------------------------|
| `structured`   | Fields → components + entity refs    | Fields → components + entity refs |
| `unstructured` | Layout/component tree (extension-dependent) | Fields → components + entity refs (**always structured**) |

Example: A `node.landing_page` with `composition: unstructured`:
- `full` → Layout Builder sections with blocks (unstructured)
- `teaser` → title + field_image + field_summary (structured, normal fields)

This means every `unstructured` bundle still needs field definitions for its non-full view modes.

### What extensions determine

Extensions tell the skills HOW an `unstructured` bundle's `full` view mode manages its content. The renderer doesn't care — it just resolves recursively.

| Extension             | `full` view mode produces                        | Recursive? |
|-----------------------|--------------------------------------------------|------------|
| `layout_builder`      | Section components with entity refs in slots     | Yes — slots contain `type: "entity"` nodes |
| `canvas`              | Components directly, no intermediate entities    | Maybe — components may have nested components in slots |
| `experience_builder`  | Components directly                              | Same as canvas |
| _(none)_              | Components directly                              | No nesting expected |

**Key insight**: `structured` bundles also have recursive entity refs (e.g., `field_author → user.user`). The recursion pattern is the same as layout_builder — entity → JSONata → may contain more entities. The renderer doesn't distinguish.

### Config change

```yaml
# designbook.config.yml
backend: drupal
extensions:                        # NEW — top-level, backend-agnostic
  - layout_builder
frameworks:
  component: sdc
  css: daisyui
dist: packages/integrations/test-integration-drupal/designbook
drupal:
  theme: packages/integrations/test-integration-drupal
```

Env variable: `DESIGNBOOK_EXTENSIONS=layout_builder` (comma-separated if multiple).

Extensions are backend-agnostic. Any backend can declare extensions:
- Drupal: `layout_builder`, `canvas`, `experience_builder`, `paragraphs`
- WordPress: `gutenberg`
- Craft CMS: `matrix`

### Data model schema change

Add `composition` to the bundle-level schema:

```yaml
content:
  node:
    article:
      # composition: structured    ← default, can be omitted
      fields:
        title: { type: string, required: true }
        field_body: { type: text }
        field_author:
          type: reference
          settings: { target_type: user, target_bundle: user }

    landing_page:
      composition: unstructured    # full view mode uses extension (layout_builder/canvas)
      fields:
        title: { type: string, required: true }
        field_image:                             # still needed for teaser/card view modes
          type: reference
          settings: { target_type: media, target_bundle: image }
        field_summary: { type: text }

  # Blocks for layout_builder — always structured (they have fields)
  block_content:
    hero:
      fields:
        field_headline: { type: string }
        field_image:
          type: reference
          settings: { target_type: media, target_bundle: image }
```

Validation: `composition` is optional, enum `[structured, unstructured]`, defaults to `structured`.

**Important**: `unstructured` only affects view_mode `full`. The bundle still has fields — they're used by teaser, card, and other structured view modes. The `full` view mode ignores these fields and uses the layout/component tree instead.

### JSONata examples by pattern

#### Structured (node.article.full)

Entity has fields, some reference other entities. JSONata outputs components + entity refs:

```jsonata
[
  { "type": "component", "component": "heading",
    "props": { "level": "h1" }, "slots": { "text": title } },
  { "type": "entity",
    "entity_type": "user", "bundle": "user",
    "view_mode": "compact",
    "data": field_author },
  { "type": "component", "component": "text-block",
    "slots": { "content": field_body } }
]
```

Renderer sees `type: "entity"` for field_author → evaluates `user.user.compact.jsonata` → gets Component[] → renders.

#### Unstructured + layout_builder (node.landing_page.full)

Entity has a layout field with sections. JSONata outputs section components whose slots contain entity refs:

```jsonata
[
  { "type": "component",
    "component": "provider:section",
    "props": { "max_width": "full", "columns": 1, "theme": "dark" },
    "slots": {
      "column_1": [
        { "type": "entity",
          "entity_type": "block_content", "bundle": "hero",
          "view_mode": "full",
          "data": layout[0].blocks[0] }
      ]
    }
  },
  { "type": "component",
    "component": "provider:section",
    "props": { "max_width": "lg", "columns": 3, "gap": "md" },
    "slots": {
      "column_1": [
        { "type": "entity",
          "entity_type": "block_content", "bundle": "card",
          "view_mode": "full",
          "data": layout[1].blocks[0] }
      ],
      "column_2": [
        { "type": "entity",
          "entity_type": "block_content", "bundle": "card",
          "view_mode": "full",
          "data": layout[1].blocks[1] }
      ],
      "column_3": [
        { "type": "entity",
          "entity_type": "block_content", "bundle": "card",
          "view_mode": "full",
          "data": layout[1].blocks[2] }
      ]
    }
  }
]
```

Renderer sees `type: "component"` (section) → renders it → finds `type: "entity"` in slots → evaluates `block_content.hero.full.jsonata` → gets Component[] → renders. Same recursion as structured.

#### Unstructured + canvas (node.campaign_page.full)

Entity has a component tree. JSONata outputs components directly:

```jsonata
[
  { "type": "component", "component": "provider:hero",
    "props": { "headline": components[0].headline,
               "image": components[0].image } },
  { "type": "component", "component": "provider:card-grid",
    "props": { "columns": 3 },
    "slots": { "items": components[1].items } }
]
```

No entity refs — components render directly with their own internal layout. Renderer just renders components, no recursion needed.

### Recursive resolution in renderer

In `scene-module-builder.ts`, the entity renderer currently evaluates JSONata and expects `ComponentSceneNode[]` back. Change to accept `SceneNode[]` (which may include `type: "entity"`) and recursively resolve:

```
function resolveNode(node: SceneNode, ctx: RenderContext): string {
  if (node.type === 'entity') {
    const data = lookupSampleData(node, ctx);
    const children = evaluateJSONata(node, data, ctx);  // SceneNode[]
    return children.map(child => resolveNode(child, ctx)).join('\n');
  }
  if (node.type === 'component') {
    // render component, but check slots for nested SceneNodes
    const resolvedSlots = {};
    for (const [name, value] of Object.entries(node.slots ?? {})) {
      if (Array.isArray(value) && value[0]?.type) {
        resolvedSlots[name] = value.map(child => resolveNode(child, ctx));
      } else {
        resolvedSlots[name] = value;  // plain string/value, pass through
      }
    }
    return renderComponent({ ...node, slots: resolvedSlots }, ctx);
  }
}
```

Recursion depth guard: max 5 levels. Warn if exceeded.

### Skill behavior matrix

Skills read `composition` + `extensions` to decide what to generate. The renderer stays dumb.

| Skill                  | Reads                  | Behavior change                                    |
|------------------------|------------------------|----------------------------------------------------|
| `debo-data-model`      | extensions             | If layout_builder: prompt for block entities when bundles are unstructured |
| `debo-shape-section`   | composition+extensions | structured: "Which entity types?" layout_builder: "Which blocks/sections?" canvas: "Which components?" |
| `debo-sample-data`     | composition+extensions | structured: field data with entity refs. layout_builder: layout tree + block data. canvas: component tree data |
| `designbook-view-modes`| composition+extensions | structured: components + entity refs. layout_builder: section components + entity slots. canvas: flat components |
| `designbook-scenes`    | —                      | No change — scenes use entity entries, JSONata handles the rest |
| `debo-design-screen`   | —                      | No change — works through scenes |

### Sample data structure for layout_builder

Sample data for `unstructured` + `layout_builder` bundles stores the layout as a tree of `type: component` and `type: entity` nodes — the same structure that JSONata outputs:

```yaml
# sections/landing/data.yml
node:
  landing_page:
    - title: "Welcome"
      layout:
        - type: component
          component: "provider:section"
          props: { max_width: full, columns: 1, theme: dark }
          slots:
            column_1:
              - type: entity
                entity_type: block_content
                bundle: hero
                view_mode: full
                record: 0
        - type: component
          component: "provider:section"
          props: { max_width: lg, columns: 3, gap: md }
          slots:
            column_1:
              - type: entity
                entity_type: block_content
                bundle: card
                view_mode: full
                record: 0
            column_2:
              - type: entity
                entity_type: block_content
                bundle: card
                view_mode: full
                record: 1
            column_3:
              - type: entity
                entity_type: block_content
                bundle: card
                view_mode: full
                record: 2

block_content:
  hero:
    - field_headline: "Welcome"
      field_image: { url: "https://picsum.photos/1200/600", alt: "Hero" }
  card:
    - field_reference: { title: "Article 1", field_media: { url: "...", alt: "..." } }
    - field_reference: { title: "Article 2", field_media: { url: "...", alt: "..." } }
    - field_reference: { title: "Article 3", field_media: { url: "...", alt: "..." } }
```

The `record` index references the block_content sample data arrays. The renderer resolves each `type: entity` node recursively: looks up `block_content.hero[0]`, evaluates `block_content.hero.full.jsonata` against that record, gets back `Component[]`.
