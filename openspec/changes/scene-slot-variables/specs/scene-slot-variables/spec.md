## ADDED Requirements

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
