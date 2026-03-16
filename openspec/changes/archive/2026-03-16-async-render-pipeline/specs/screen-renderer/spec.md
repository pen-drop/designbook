## MODIFIED Requirements

### Requirement: Screen Adapter Interface

Framework adapters SHALL handle import tracking and JS module generation via the `ModuleBuilder` interface. The `loadScenesYml` function SHALL delegate all framework-specific concerns to the adapter layer.

The `ModuleBuilder` interface SHALL contain exactly two methods:

```typescript
interface ModuleBuilder {
  /** Called once per module to set up import tracking. */
  createImportTracker(designbookDir: string): {
    trackImport: (componentId: string) => string;
    getImports: () => string[];
  };

  /** Generate the final CSF module code string. */
  generateModule(opts: {
    imports: string[];
    group: string;
    source: string;
    scenes: ResolvedScene[];
  }): string;
}
```

**Removed from interface**: `resolveMarkers()`. Entity and config marker resolution is eliminated — the async render pipeline resolves all nodes inline.

#### Scenario: SDC Adapter (Twig)

- **GIVEN** the SDC adapter is configured
- **WHEN** it receives a `ComponentSceneNode` with `component: "test_provider:heading"`
- **THEN** it renders the Twig component call string for that component with the resolved props/slots

#### Scenario: React Adapter

- **GIVEN** the React adapter is configured
- **WHEN** it receives a `ComponentSceneNode` with `component: "ArticleCard"`
- **THEN** it renders a `React.createElement(ArticleCard, {...})` call string

#### Scenario: Vue3 Adapter

- **GIVEN** the Vue3 adapter is configured
- **WHEN** it receives a `ComponentSceneNode` with `component: "ArticleCard"`
- **THEN** it renders an `h(ArticleCard, {...})` call string

#### Scenario: SDC adapter handles import tracking

- **WHEN** a component node with `component: "test_provider:heading"` is rendered via the SDC adapter
- **THEN** the adapter resolves the component path at `../components/heading/heading.component.yml`
- **AND** generates an `import * as X` statement
- **AND** `buildSceneModule()` does NOT contain component path resolution logic

#### Scenario: Framework-agnostic buildSceneModule

- **WHEN** `buildSceneModule()` processes a scenes file
- **THEN** it performs only: YAML parsing, data model loading, sample data loading, scene metadata extraction, render service dispatch, and delegation to `generateModule()`
- **AND** contains zero SDC/Twig-specific code
- **AND** contains no marker resolution logic

#### Scenario: SDC adapter generates JS module

- **WHEN** all scene nodes have been rendered
- **THEN** the SDC adapter's `generateModule()` generates a complete CSF module with `TwigSafeArray`, `Drupal.attachBehaviors()`, and import statements
- **AND** `buildSceneModule()` receives the finished module code string
