# scene-conventions Specification

## Purpose
Authoring conventions for scenes: duck-typed nodes, slot variables, scene references, shell scenes, entity routing, and listing patterns.

---

## Requirement: Scene node types are duck-typed by identifying key

Scene nodes in `*.scenes.yml` are duck-typed — no `type` field.

| Builder | `appliesTo` condition |
|---|---|
| `componentBuilder` | `'component' in node` |
| `entityBuilder` | `'entity' in node` (YAML) or `node.type === 'entity'` (normalized from JSONata) |
| `imageStyleBuilder` | `'image' in node` |
| `sceneBuilder` | `'scene' in node` |

- A YAML item with `component:` key -> `componentBuilder.appliesTo()` returns true
- A YAML item with `entity:` key -> `entityBuilder.appliesTo()` returns true
- A YAML item with `scene:` key -> `sceneBuilder.appliesTo()` returns true
- A YAML item with `image:` key -> `imageStyleBuilder.appliesTo()` returns true

---

## Requirement: Slot variable placeholders

A slot value of `$identifier` marks an injection point. Any slot at any nesting depth MAY be a variable. Multiple variables in one scene (e.g. `content: $content` and `sidebar: $sidebar`) MUST be independently substitutable.

---

## Requirement: `with:` fills variables on scene references

A scene reference node supports `with:` map whose keys match `$variable` names in the referenced scene. When omitted, variables remain as literal strings.

---

## Requirement: SceneSceneNode uses scene:string

```typescript
export interface SceneSceneNode extends SceneNode {
  scene: string;            // "source:sceneName" (e.g. "design-system:shell")
  with?: Record<string, unknown>;
  slots?: Record<string, unknown>; // deprecated alias for `with`
}
```

The builder parses `"design-system:shell"` as source `"design-system"`, scene name `"shell"`.

---

## Requirement: Substitution on raw SceneDef before building

```
1. findScene(ref) -> raw SceneDef
2. if (with) -> scene = substitute(scene, with)
3. for entry of scene.items -> ctx.buildNode(entry) -> ComponentNode[]
4. return ComponentNode[]
```

- After substitution, `buildNode()` receives entries with no `$` strings
- Unresolved `$variable` (no matching key in `with:`) is left as-is

---

## Requirement: `slots:` deprecated alias

The old `slots:` key on scene references SHALL be accepted as alias for `with:` with deprecation warning: `[Designbook] SceneBuilder: "slots:" on scene ref "..." is deprecated -- use "with:" instead`

---

## Requirement: map-entity stage for structured entity rendering

`map-entity` covers all structured entity rendering: all view modes except `full` when `composition: unstructured`, and recursive entity references.

- Non-full view_mode always uses `map-entity` regardless of `composition`
- Recursive entity resolution MAY be arbitrarily deep

---

## Requirement: Listing scenes use listing.* config entities

- Listing pages SHALL use an `entity: listing.*` node whose JSONata declares entity refs inline
- Detail pages SHALL use an `entity` node with a single `record` index
- `records: [0, 1, 2]` shorthand is for component demos only — MUST NOT be used for listing scenes

---

## Requirement: Shell scenes define the application layout container

Shell scenes compose a page component with header, content, and footer slots at `designbook/design-system/design-system.scenes.yml`. Exactly one slot MUST use `$content`.

- Section scenes reference shell via `scene: "design-system:shell"` with `with:` map filling `$content`
- Header and footer slots MUST inline all sub-component slots with props and content — never use `story: default` alone
- Output location: `designbook/design-system/design-system.scenes.yml` with `group: "Designbook/Design System"`

---

## Requirement: Scene resources are split by concern

Three resource files under `.agents/skills/designbook/design/resources/`:
- `scenes-schema.md` — JSON Schema for `*.scenes.yml`, scene node types, ComponentNode output
- `jsonata-reference.md` — JSONata expression format, ComponentNode output, nested entity refs
- `story-meta-schema.md` — JSON Schema for `meta.yml` at `designbook/stories/{storyId}/meta.yml`

---

## Requirement: YAML anchors work natively

Standard YAML anchors (`&` / `*`) work out of the box. No implementation needed.
