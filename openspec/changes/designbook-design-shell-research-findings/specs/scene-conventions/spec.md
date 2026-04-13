## MODIFIED Requirements

### Requirement: Scene node types are duck-typed by identifying key

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

#### Scenario: Component builder matches component node

- **WHEN** a scene YAML item has a `component:` key
- **THEN** `componentBuilder.appliesTo()` returns true and no other builder claims it

#### Scenario: Entity builder matches entity node

- **WHEN** a scene YAML item has an `entity:` key
- **THEN** `entityBuilder.appliesTo()` returns true

---

### Requirement: Slot variable placeholders

A slot value of `$identifier` marks an injection point. Any slot at any nesting depth MAY be a variable. Multiple variables in one scene (e.g. `content: $content` and `sidebar: $sidebar`) MUST be independently substitutable.

#### Scenario: Multiple slot variables substituted independently

- **WHEN** a scene declares both `content: $content` and `sidebar: $sidebar` and a referencing scene fills both with `with:`
- **THEN** each variable is replaced with its own value independently

---

### Requirement: `with:` fills variables on scene references

A scene reference node supports `with:` map whose keys match `$variable` names in the referenced scene. When omitted, variables remain as literal strings.

#### Scenario: with map fills named variable

- **WHEN** a scene reference includes `with: {content: <value>}` and the referenced scene declares `content: $content`
- **THEN** the variable is replaced with the provided value before building

---

### Requirement: SceneSceneNode uses scene:string

```typescript
export interface SceneSceneNode extends SceneNode {
  scene: string;            // "source:sceneName" (e.g. "design-system:shell")
  with?: Record<string, unknown>;
  slots?: Record<string, unknown>; // deprecated alias for `with`
}
```

The builder parses `"design-system:shell"` as source `"design-system"`, scene name `"shell"`.

#### Scenario: Scene reference parsed correctly

- **WHEN** a scene node has `scene: "design-system:shell"`
- **THEN** the builder resolves source as `design-system` and scene name as `shell`

---

### Requirement: Substitution on raw SceneDef before building

```
1. findScene(ref) -> raw SceneDef
2. if (with) -> scene = substitute(scene, with)
3. for entry of scene.items -> ctx.buildNode(entry) -> ComponentNode[]
4. return ComponentNode[]
```

- After substitution, `buildNode()` receives entries with no `$` strings
- Unresolved `$variable` (no matching key in `with:`) is left as-is

#### Scenario: Unresolved variable left as-is

- **WHEN** a scene references a variable `$sidebar` but the `with:` map contains no key for `sidebar`
- **THEN** the literal string `$sidebar` is passed through to `buildNode()`

---

### Requirement: `slots:` deprecated alias

The old `slots:` key on scene references SHALL be accepted as alias for `with:` with deprecation warning: `[Designbook] SceneBuilder: "slots:" on scene ref "..." is deprecated -- use "with:" instead`

#### Scenario: slots key triggers deprecation warning

- **WHEN** a scene reference uses `slots:` instead of `with:`
- **THEN** the system accepts the value and emits a deprecation warning

---

### Requirement: map-entity stage for structured entity rendering

`map-entity` covers all structured entity rendering: all view modes except `full` when `composition: unstructured`, and recursive entity references.

- Non-full view_mode always uses `map-entity` regardless of `composition`
- Recursive entity resolution MAY be arbitrarily deep

#### Scenario: Non-full view mode uses map-entity

- **WHEN** an entity node has `view_mode: teaser`
- **THEN** it is handled by `map-entity` regardless of the `composition` setting

---

### Requirement: Shell scenes define the application layout container

Shell scenes compose a page component with header, content, and footer slots at `designbook/design-system/design-system.scenes.yml`. Exactly one slot MUST use `$content`.

- Section scenes reference shell via `scene: "design-system:shell"` with `with:` map filling `$content`
- Header and footer slots MUST inline all sub-component slots with props and content — never use `story: default` alone
- Output location: `designbook/design-system/design-system.scenes.yml` with `group: "Designbook/Design System"`

#### Scenario: Shell scene has exactly one content variable

- **WHEN** a shell scene is defined
- **THEN** exactly one slot in the scene uses `$content` as its value

---

### Requirement: Scene resources are split by concern

Three resource files under `.agents/skills/designbook/design/resources/`:
- `scenes-schema.md` — JSON Schema for `*.scenes.yml`, scene node types, ComponentNode output
- `jsonata-reference.md` — JSONata expression format, ComponentNode output, nested entity refs
- `story-meta-schema.md` — JSON Schema for `meta.yml` at `designbook/stories/{storyId}/meta.yml`

#### Scenario: Scene schema resource loaded during scene stage

- **WHEN** the scene stage is active
- **THEN** `scenes-schema.md` is available as a resource for scene authoring guidance

---

### Requirement: YAML anchors work natively

Standard YAML anchors (`&` / `*`) work out of the box. No implementation needed.

#### Scenario: YAML anchor reuse in scenes file

- **WHEN** a `*.scenes.yml` file uses `&anchor` and `*anchor` syntax
- **THEN** the scene is parsed correctly without any special handling

---

### Requirement: Core scene constraints are limited to inline styles and duck-typing

The core `scenes-constraints.md` rule in `designbook/` SHALL only contain constraints that apply universally regardless of backend or CSS framework:

- Scenes MUST use inline styles (no CSS class names from any framework)
- Scene slot values use `$identifier` duck-typing convention
- `$content` is the reserved variable name for shell content injection

Drupal-specific constraints (entity type and bundle format, image node format, listing scene conventions) MUST live in `designbook-drupal/` rules, not in the core rule. CSS-framework-specific constraints (Tailwind `@source` directives, utility class reasoning) MUST live in `designbook-css-tailwind/` rules, not in the core rule.

#### Scenario: Core constraints do not reference Drupal entity format

- **WHEN** the core `scenes-constraints.md` rule is loaded without a Drupal backend
- **THEN** no Drupal-specific entity format guidance is present in the loaded rule content

#### Scenario: Core constraints do not reference Tailwind

- **WHEN** the core `scenes-constraints.md` rule is loaded without a Tailwind CSS framework
- **THEN** no Tailwind-specific guidance is present in the loaded rule content

#### Scenario: Drupal entity format constraint is enforced via designbook-drupal rule

- **WHEN** the active backend is Drupal and the scene stage is running
- **THEN** the `designbook-drupal/` rule for entity format is loaded and its constraints apply
