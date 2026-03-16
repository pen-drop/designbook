# Vue Scene Builder

> ModuleBuilder and SceneNodeRenderer for Vue 3 scene rendering.

## Requirement: Directory structure

The Vue builder SHALL follow the `builder-directory-convention` spec:
- `src/renderer/builders/vue/module-builder.ts`
- `src/renderer/builders/vue/renderer.ts`
- `src/renderer/builders/vue/index.ts`

#### Scenario: Barrel export
- **WHEN** `builders/vue/index.ts` is imported
- **THEN** it SHALL export `vueModuleBuilder`, `vueComponentRenderer`, and `vueRenderers`

---

## Requirement: Import tracking

`createImportTracker()` SHALL track component imports with `.vue` extension handling.

#### Scenario: Vue SFC import
- **GIVEN** a component reference `@/components/Heading.vue`
- **WHEN** `trackImport("@/components/Heading.vue")` is called
- **THEN** it SHALL return a variable name (e.g. `Heading`)
- **AND** `getImports()` SHALL include `import Heading from '@/components/Heading.vue';`

#### Scenario: Import without .vue extension
- **GIVEN** a component reference `@/components/Heading` (no extension)
- **WHEN** `trackImport()` is called
- **THEN** it SHALL append `.vue` and generate `import Heading from '@/components/Heading.vue';`

#### Scenario: Duplicate and collision handling
- Same rules as React builder (deduplicate, disambiguate on collision)

---

## Requirement: Component rendering

The renderer SHALL convert `ComponentSceneNode` to Vue template strings.

#### Scenario: Simple component with props
- **GIVEN** `{ type: 'component', component: '@/components/Badge.vue', props: { label: 'New' } }`
- **WHEN** rendered
- **THEN** output SHALL be `<Badge label="New" />`

#### Scenario: Component with default slot
- **GIVEN** `slots: { default: "Hello world" }`
- **WHEN** rendered
- **THEN** output SHALL be `<Component>Hello world</Component>`

#### Scenario: Component with named slots
- **GIVEN** `slots: { header: [...], footer: "Copyright" }`
- **WHEN** rendered
- **THEN** output SHALL use `<template #header>...</template>` and `<template #footer>Copyright</template>`

#### Scenario: Dynamic props
- **GIVEN** `props: { items: "$expression" }` (runtime data)
- **WHEN** rendered
- **THEN** output SHALL use `:items="expression"` (v-bind)

---

## Requirement: Entity rendering

Same as React builder — entities resolve to component trees with sample data.

#### Scenario: Single entity record
- **GIVEN** entity `node.article` view_mode `teaser` record `0`
- **WHEN** rendered
- **THEN** output SHALL be Vue template with `v-bind` for data spreading

---

## Requirement: Module generation

`generateModule()` SHALL produce valid CSF3 with Vue render objects.

#### Scenario: Single scene
- **GIVEN** one resolved scene
- **WHEN** `generateModule()` is called
- **THEN** output SHALL be a valid ES module with:
  - Import statements for all tracked components
  - Default export with `title` and `tags: ['scene']`
  - Named export with `render: () => ({ components: {...}, template: \`...\` })`

#### Scenario: Components registration
- **GIVEN** imports `Heading` and `Card`
- **WHEN** the render function is generated
- **THEN** `components: { Heading, Card }` SHALL include all used components

#### Scenario: Multiple scenes
- **GIVEN** scenes `["Article List", "Article Detail"]`
- **WHEN** `generateModule()` is called
- **THEN** output SHALL contain two named exports with PascalCase names
