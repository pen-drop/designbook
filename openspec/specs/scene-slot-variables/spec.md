# Spec: scene-slot-variables

## Overview

Scene templates can declare **slot variables** using `$slotName` syntax. When a scene references another scene via `type: scene`, it fills those variables via a `with:` map. The builder substitutes placeholders by walking the raw YAML object before building — no changes to `ComponentNode` required.

This replaces the current implicit slot-override mechanism (which blindly merges overrides onto all built items) with an explicit, template-driven injection model.
## Requirements

### 1. Slot Variable Syntax in Templates

A slot value of `$identifier` (a string starting with `$`) marks that slot as an injection point:

```yaml
# design-system/design-system.scenes.yml
scenes:
  - name: shell
    items:
      - component: provider:page
        slots:
          header:
            - component: provider:header
              story: default
          content: $content       # injection point
          footer:
            - component: provider:footer
              story: default
```

- The `$identifier` is a plain YAML string value
- Any slot in any component can be an injection point
- Multiple injection points per scene are allowed (`$content`, `$sidebar`, etc.)
- A slot variable with no matching `with:` key renders as a visible placeholder (see §3)

### 2. Scene Reference with `with:` Map

The `type: scene` entry gains a `with:` key (replacing `slots:`) to fill injection points:

```yaml
# sections/blog/blog.section.scenes.yml
scenes:
  - name: "Blog Detail"
    items:
      - type: scene
        ref: design-system:shell
        with:
          content:
            - entity: node.article
              view_mode: full
              record: 0

  - name: "Blog Listing"
    items:
      - type: scene
        ref: design-system:shell
        with:
          content:
            - entity: node.article
              view_mode: teaser
              records: [0, 1, 2]
```

### 3. Builder Behaviour

Substitution happens on the **raw `SceneDef` object** (after YAML parse, before `buildNode`). `ComponentNode` is never aware of variables.

**Substitution function** — walks any JS value, replaces `$key` strings:

```ts
function substitute(obj: unknown, vars: Record<string, unknown>): unknown {
  if (typeof obj === 'string' && obj.startsWith('$')) {
    const key = obj.slice(1);
    return key in vars ? vars[key] : obj;  // leave unresolved as "$key" string
  }
  if (Array.isArray(obj)) return obj.map(v => substitute(v, vars));
  if (obj && typeof obj === 'object')
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, substitute(v, vars)]));
  return obj;
}
```

**Unresolved variables** — if a `$variable` has no match in `with:`, the string is left as-is in the `ComponentNode.slots` value (which already allows `string` slot values). The renderer detects `$identifier` strings in slots and emits a visual placeholder:

```html
<div style="border: 1px dashed #ccc; border-radius: 4px; padding: 8px 12px;
            color: #999; font-size: 11px; font-family: monospace;">
  $content
</div>
```

This makes unresolved injection points immediately visible in Storybook — the developer can see which slots still need to be filled.

**sceneBuilder flow:**

```
1. findScene(ref) → raw SceneDef
2. if (with) → scene = substitute(scene, with)  ← walk + replace
3. for entry of scene.items → ctx.buildNode(entry) → ComponentNode[]
4. return ComponentNode[]
```

Before substitution:
```
SceneDef.items[0] = {
  component: "provider:page",
  slots: { header: [...], content: "$content", footer: [...] }
}
```

After `substitute(scene, { content: [{entity: "node.article", ...}] })`:
```
SceneDef.items[0] = {
  component: "provider:page",
  slots: { header: [...], content: [{entity: "node.article", ...}], footer: [...] }
}
```

Then `buildNode` processes it as a normal component entry.

### 4. Type Changes

**`SceneSceneNode`** — `slots` renamed to `with`:

```ts
interface SceneSceneNode extends SceneNode {
  type: 'scene';
  ref: string;
  with?: Record<string, unknown>;  // was: slots
}
```

**`ComponentNode`** — unchanged. Variables never reach the built output.

### 5. Remove `SceneLayoutEntry`

`SceneLayoutEntry` and its variants (`SceneComponentEntry`, `SceneEntityEntry`, `SceneConfigEntry`) are removed. Items in `SceneDef` and `with:` values are typed as `SceneNode[]` directly.

Builders detect entry type by property presence instead of `type` field:

| Builder | `appliesTo` condition |
|---|---|
| `entityBuilder` | `'entity' in node` |
| `componentBuilder` | `'component' in node` |
| `configListBuilder` | `'config' in node` |
| `sceneBuilder` | `node.type === 'scene'` |

`entryToSceneNode()` is removed from both `scene-builder.ts` and `scene-module-builder.ts`. The type guards `isSceneEntityEntry`, `isSceneComponentEntry`, `isSceneConfigEntry` are also removed.

`SceneDef.items` changes from `SceneLayoutEntry[]` to `SceneNode[]`.

### 6. Backward Compatibility

The old `slots:` key on `type: scene` entries is accepted as an alias for `with:`:

```
[Designbook] SceneBuilder: "slots" on scene ref is deprecated, use "with"
```

### 7. YAML Anchors (native, no implementation needed)

Standard YAML anchors (`&` / `*`) work out of the box. Useful for shell variants:

```yaml
_header: &header
  - component: provider:header
    story: default

scenes:
  - name: shell
    items:
      - component: provider:page
        slots:
          header: *header
          content: $content

  - name: minimal
    items:
      - component: provider:page
        slots:
          header: *header
          content: $content
```

No implementation needed — document only.

### Requirement: Slot variable placeholders in scene templates
A slot value of `$identifier` in a `*.scenes.yml` file SHALL mark that slot as an injection point. Any slot in any component at any nesting depth MAY be a variable.

#### Scenario: Variable declared in shell slot
- **WHEN** a shell scene contains `content: $content` as a slot value
- **THEN** the builder recognizes it as a variable placeholder

#### Scenario: Multiple variables in one scene
- **WHEN** a scene contains `content: $content` and `sidebar: $sidebar`
- **THEN** both are independently substitutable

### Requirement: `with:` key on scene references
A `type: scene` entry SHALL support a `with:` map whose keys match `$variable` names declared in the referenced scene template.

#### Scenario: Section fills shell variable
- **WHEN** a section scene has `type: scene, ref: design-system:shell, with: {content: [...]}`
- **THEN** `$content` in the shell is replaced with the provided entries before building

#### Scenario: `with:` is omitted
- **WHEN** a `type: scene` entry has no `with:` key
- **THEN** the referenced scene is built without substitution (variables remain as strings)

### Requirement: Substitution on raw SceneDef before building
Variable substitution SHALL occur on the parsed YAML object (the `SceneDef`) before any `buildNode()` calls. `ComponentNode` SHALL NOT carry variable placeholders.

#### Scenario: Substituted scene builds normally
- **WHEN** `substitute(scene, withValues)` is called before iterating `scene.items`
- **THEN** `buildNode()` receives a normal component entry with no `$` strings

### Requirement: Unresolved variables render as visible placeholder
A `$variable` with no matching key in `with:` SHALL be left as a literal string in the slot value. The renderer SHALL detect slot values matching `/^\$\w+$/` and emit a styled placeholder div.

#### Scenario: Unresolved variable in Storybook
- **WHEN** a shell scene is rendered without a `with:` providing `$content`
- **THEN** the content slot renders a grey dashed box showing the variable name `$content`

#### Scenario: Resolved variable does not show placeholder
- **WHEN** `with: {content: [...]}` is provided
- **THEN** no placeholder box is rendered; content entries are rendered normally

### Requirement: `slots:` deprecated alias on scene references
The old `slots:` key on `type: scene` entries SHALL be accepted as an alias for `with:` and SHALL emit a deprecation warning to the console.

#### Scenario: Old `slots:` syntax still works
- **WHEN** a scene file uses `type: scene, ref: ..., slots: {content: [...]}`
- **THEN** the scene builds correctly with a deprecation warning logged

### Requirement: Items typed as SceneNode[], SceneLayoutEntry removed
`SceneDef.items` SHALL be typed as `SceneNode[]`. `SceneLayoutEntry`, `SceneComponentEntry`, `SceneEntityEntry`, `SceneConfigEntry`, and their type guards SHALL be removed. `entryToSceneNode()` SHALL be removed from `scene-builder.ts` and `scene-module-builder.ts`.

#### Scenario: Component entry without type field
- **WHEN** a YAML item is `{component: "provider:heading", props: {...}}`
- **THEN** `componentBuilder.appliesTo()` returns true via `'component' in node`

#### Scenario: Entity entry without type field
- **WHEN** a YAML item is `{entity: "node.article", view_mode: "full"}`
- **THEN** `entityBuilder.appliesTo()` returns true via `'entity' in node`

#### Scenario: Config entry without type field
- **WHEN** a YAML item is `{config: "list.recent_articles"}`
- **THEN** `configListBuilder.appliesTo()` returns true via `'config' in node`

#### Scenario: Scene entry with explicit type field
- **WHEN** a YAML item is `{type: "scene", ref: "design-system:shell"}`
- **THEN** `sceneBuilder.appliesTo()` returns true via `node.type === 'scene'`

## Tests

Tests live in `src/renderer/builders/__tests__/scene-builder.test.ts`.

### Unit: `substitute()`

The substitution function is pure and tested independently:

| Case | Input | Expected |
|---|---|---|
| string match | `"$content"`, `{content: [{entity: "node.article"}]}` | `[{entity: "node.article"}]` |
| string no match | `"$content"`, `{}` | `"$content"` (left as-is) |
| non-variable string | `"hello"`, `{hello: [...]}` | `"hello"` (unchanged) |
| nested object | `{slots: {content: "$content"}}` | `{slots: {content: [...]}}` |
| nested array | `[{slots: {x: "$x"}}]` | `[{slots: {x: [...]}}]` |
| multiple variables | `{a: "$a", b: "$b"}`, `{a: [1], b: [2]}` | `{a: [1], b: [2]}` |
| variable in non-slot | `{label: "$content"}` | replaced — acceptable, document as convention |

### Integration: scene composition

Test fixtures in `src/renderer/builders/__tests__/fixtures/scene-variables/`:

**`shell.scenes.yml`** — template with `$content` placeholder:
```yaml
group: "Test/Shell"
scenes:
  - name: shell
    items:
      - component: test:page
        slots:
          header:
            - component: test:header
          content: $content
          footer:
            - component: test:footer
```

**`section.scenes.yml`** — uses `with:` to fill:
```yaml
group: "Test/Section"
scenes:
  - name: detail
    items:
      - type: scene
        ref: shell:shell
        with:
          content:
            - component: test:article
```

Test cases:

| Case | Expected output |
|---|---|
| `with` fills `$content` | `page` component has `content: [ArticleComponent]` |
| `with` is empty, `$content` present | `content: []` |
| no `$variable` in template | scene built unchanged (regression: existing scenes still work) |
| old `slots:` key used | same result + deprecation warning logged |
| `$undefined` variable | left as `"$undefined"` string → placeholder div rendered |
| multiple `$vars` in one scene | all substituted correctly |
| nested scene ref (`type: scene` inside a `with:` value) | not supported — renders as-is (non-goal) |

### Regression: existing scenes

Existing fixtures in `src/renderer/__tests__/` must continue to pass without modification. Scenes without `$variables` or `with:` are unaffected by the substitution step.

## Affected Files

| File | Change |
|---|---|
| `src/renderer/types.ts` | Remove `SceneLayoutEntry` variants + guards; rename `slots` → `with` on `SceneSceneNode` |
| `src/renderer/builders/scene-builder.ts` | Add `substitute()`; remove `entryToSceneNode` + merge logic; add `slots`→`with` alias |
| `src/renderer/scene-module-builder.ts` | Remove `entryToSceneNode`; update `SceneDef.items` handling |
| `src/renderer/builders/entity-builder.ts` | `appliesTo`: `'entity' in node` |
| `src/renderer/builders/component-builder.ts` | `appliesTo`: `'component' in node` |
| `src/renderer/builders/config-list-builder.ts` | `appliesTo`: `'config' in node` |
| `src/renderer/builders/__tests__/scene-builder.test.ts` | New test file |
| `src/renderer/builders/__tests__/fixtures/scene-variables/` | New fixture files |
| `.agent/skills/designbook-scenes/SKILL.md` | Update YAML examples: `slots:` → `with:` on scene refs |
| `.agent/workflows/debo-design-shell.md` | Update shell example to use `$content` placeholder |

## Non-Goals

- Runtime variable substitution (everything resolves at build time)
- Nested variable references (`$content` inside a `with:` value)
- Dynamic variable names (only static `$identifier` strings)
