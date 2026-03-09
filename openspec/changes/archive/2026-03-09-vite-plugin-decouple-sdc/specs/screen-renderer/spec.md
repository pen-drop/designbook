## MODIFIED Requirements

### Requirement: Screen Adapter Interface

Framework adapters SHALL handle the complete rendering pipeline including import tracking, entity marker resolution, and JS module generation. The `loadScenesYml` function SHALL delegate all framework-specific concerns to the adapter layer.

#### Scenario: SDC adapter handles import tracking
- **WHEN** a component node with `component: "heading"` is rendered via the SDC adapter
- **THEN** the adapter resolves the component path at `../components/heading/heading.component.yml`
- **AND** generates an `import * as X` statement
- **AND** `loadScenesYml` does NOT contain component path resolution logic

#### Scenario: SDC adapter handles entity marker resolution
- **WHEN** the entity renderer produces an `__ENTITY_EXPR__` marker
- **THEN** the SDC adapter's post-processing resolves it by evaluating JSONata against sample data
- **AND** renders resulting `ComponentNode[]` through the render service
- **AND** `loadScenesYml` does NOT contain marker resolution logic

#### Scenario: SDC adapter generates JS module
- **WHEN** all scene nodes have been rendered
- **THEN** the SDC adapter generates a complete CSF module with `TwigSafeArray`, `Drupal.attachBehaviors()`, and import statements
- **AND** `loadScenesYml` receives the finished module code string

#### Scenario: Framework-agnostic loadScenesYml
- **WHEN** `loadScenesYml` processes a scenes file
- **THEN** it performs only: YAML parsing, data model loading, sample data loading, scene metadata extraction, and delegation to the render service
- **AND** contains zero SDC/Twig-specific code
