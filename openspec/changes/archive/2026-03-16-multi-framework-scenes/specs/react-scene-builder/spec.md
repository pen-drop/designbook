# React Scene Builder

> ModuleBuilder and SceneNodeRenderer for React/JSX scene rendering.

## Requirement: Directory structure

The React builder SHALL follow the `builder-directory-convention` spec:
- `src/renderer/builders/react/module-builder.ts`
- `src/renderer/builders/react/renderer.ts`
- `src/renderer/builders/react/index.ts`

#### Scenario: Barrel export
- **WHEN** `builders/react/index.ts` is imported
- **THEN** it SHALL export `reactModuleBuilder`, `reactComponentRenderer`, and `reactRenderers`

---

## Requirement: Import tracking

`createImportTracker()` SHALL track component imports from project-relative paths.

#### Scenario: Path-based import
- **GIVEN** a component reference `@/components/Heading`
- **WHEN** `trackImport("@/components/Heading")` is called
- **THEN** it SHALL return a variable name (e.g. `Heading`)
- **AND** `getImports()` SHALL include `import Heading from '@/components/Heading';`

#### Scenario: Relative path import
- **GIVEN** a component reference `./src/components/Card`
- **WHEN** `trackImport("./src/components/Card")` is called
- **THEN** it SHALL return a variable name derived from the filename (e.g. `Card`)

#### Scenario: Duplicate import
- **GIVEN** the same component is referenced twice in a scene
- **WHEN** `trackImport()` is called both times
- **THEN** it SHALL return the same variable name
- **AND** `getImports()` SHALL contain only one import statement

#### Scenario: Name collision
- **GIVEN** `@/components/ui/Card` and `@/components/layout/Card`
- **WHEN** both are tracked
- **THEN** the second SHALL receive a disambiguated name (e.g. `Card2`)

---

## Requirement: Component rendering

The renderer SHALL convert `ComponentSceneNode` to JSX strings.

#### Scenario: Simple component with props
- **GIVEN** `{ type: 'component', component: '@/components/Badge', props: { label: 'New' } }`
- **WHEN** rendered
- **THEN** output SHALL be `<Badge label="New" />`

#### Scenario: Component with children slot
- **GIVEN** `slots: { children: "Hello world" }`
- **WHEN** rendered
- **THEN** output SHALL be `<Component>Hello world</Component>`

#### Scenario: Component with nested slot
- **GIVEN** `slots: { header: [{ type: 'component', component: '@/components/Badge', props: { label: 'New' } }] }`
- **WHEN** rendered
- **THEN** output SHALL be `<Component header={<Badge label="New" />} />`

#### Scenario: Component with both children and named slots
- **GIVEN** `slots: { children: "Content", header: [...] }`
- **WHEN** rendered
- **THEN** `children` becomes JSX children, named slots become props

---

## Requirement: Entity rendering

Entity nodes SHALL be rendered as JSX expressions using view-mode component mapping.

#### Scenario: Single entity record
- **GIVEN** `{ type: 'entity', entity_type: 'node', bundle: 'article', view_mode: 'teaser', record: 0 }`
- **AND** a view-mode JSONata mapping exists for `node.article.teaser`
- **WHEN** rendered
- **THEN** output SHALL be the resolved component tree with sample data inlined

#### Scenario: Multiple entity records
- **GIVEN** `records: [0, 1, 2]`
- **WHEN** rendered
- **THEN** output SHALL contain one component group per record

---

## Requirement: Module generation

`generateModule()` SHALL produce valid CSF3 with React render functions.

#### Scenario: Single scene
- **GIVEN** one resolved scene with slot `content` containing `["<Heading>Blog</Heading>", "<Card />"]`
- **WHEN** `generateModule()` is called
- **THEN** output SHALL be a valid ES module with:
  - Import statements for all tracked components
  - `import React from 'react';`
  - Default export with `title` and `tags: ['scene']`
  - Named export with `render: () => (<>...</>)`

#### Scenario: Multiple scenes
- **GIVEN** scenes `["Article List", "Article Detail"]`
- **WHEN** `generateModule()` is called
- **THEN** output SHALL contain two named exports with PascalCase names

#### Scenario: Layout with multiple slots
- **GIVEN** a scene with slots `header`, `content`, `footer`
- **WHEN** the shell layout is applied
- **THEN** each slot's components SHALL be rendered in the corresponding layout position
