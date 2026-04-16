## MODIFIED Requirements

### Requirement: Shell scenes define the application layout container

Shell scenes compose a page component with header, content, and footer slots at `designbook/design-system/design-system.scenes.yml`. Exactly one slot MUST use `$content`.

- Section scenes reference shell via `scene: "design-system:shell"` with `with:` map filling `$content`
- Header and footer slots MUST inline all sub-component slots with props and content — never use `story: default` alone
- Output location: `designbook/design-system/design-system.scenes.yml` with `group: "Designbook/Design System"`

The `scenes-constraints` rules (core, drupal, tailwind) SHALL only be loaded for `create-scene` steps, not for intake steps. Loading scope: `when.steps: [design-shell:create-scene, design-screen:create-scene]`.

#### Scenario: Scenes constraints loaded for scene creation
- **WHEN** the workflow engine resolves rules for the `design-shell:create-scene` step
- **THEN** `scenes-constraints.md` rules are loaded

#### Scenario: Scenes constraints not loaded for intake
- **WHEN** the workflow engine resolves rules for the `design-shell:intake` step
- **THEN** `scenes-constraints.md` rules are NOT loaded

#### Scenario: Shell-only blueprints exclude irrelevant types
- **WHEN** the workflow engine resolves blueprints for `design-shell:intake`
- **THEN** `section.md` and `grid.md` blueprints are NOT loaded (they are only relevant for `design-screen:intake`)
