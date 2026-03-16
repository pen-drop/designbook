## Phase 1: Refactor — SDC Decoupling

- [ ] **T1.1** Add typed `frameworks.component` to `DesignbookConfig` in `src/config.ts`
  - Union type: `'sdc' | 'react' | 'vue'`
  - Default: `'sdc'` (backwards compatible)
  - Spec: `framework-dispatch`

- [ ] **T1.2** Add `frameworks.component` to CLI `config` command env output (`DESIGNBOOK_FRAMEWORK_COMPONENT`)
  - Spec: `designbook-configuration` (existing)

- [ ] **T1.3** Refactor `src/vite-plugin.ts` — extract builder resolution into `resolveBuilder(config)` function
  - Dynamic import based on `frameworks.component`
  - Remove hardcoded `buildSdcModule` fallback
  - Spec: `framework-dispatch`

- [ ] **T1.4** Guard `drupal.theme` in `src/cli.ts` — only required when `frameworks.component === 'sdc'`
  - `validate component` errors if SDC + no drupal.theme
  - `validate component` is unavailable for react/vue (no component.yml)
  - Spec: `framework-dispatch`

- [ ] **T1.5** Guard `drupal.theme` in `src/preset.ts` — framework-aware `.storybook` directory resolution
  - SDC: derive from `drupal.theme`
  - React/Vue: project root
  - Spec: `framework-dispatch`

- [ ] **T1.6** Make `vitest-plugin-sdc.ts` conditional — only load `sdcDedupPlugin` when framework is `sdc`
  - Spec: `framework-dispatch`

## Phase 2: React Builder

- [ ] **T2.1** Create `src/renderer/builders/react/renderer.ts`
  - Implement `SceneNodeRenderer` for ComponentSceneNode → JSX
  - Handle props, children slot, named slots as JSX props
  - Spec: `react-scene-builder`

- [ ] **T2.2** Create `src/renderer/builders/react/module-builder.ts`
  - `createImportTracker()` — path-based ES imports, dedup, collision handling
  - `resolveMarkers()` — minimal (entities resolved inline)
  - `generateModule()` — CSF3 with `render: () => (<>...</>)`
  - Spec: `react-scene-builder`

- [ ] **T2.3** Create `src/renderer/builders/react/index.ts`
  - Barrel export: `reactModuleBuilder`, `reactComponentRenderer`, `reactRenderers`
  - Spec: `builder-directory-convention` (existing)

- [ ] **T2.4** Update `src/renderer/index.ts` — re-export react builder symbols
  - Spec: `builder-directory-convention` (existing)

## Phase 3: Vue Builder

- [ ] **T3.1** Create `src/renderer/builders/vue/renderer.ts`
  - Implement `SceneNodeRenderer` for ComponentSceneNode → Vue template
  - Handle props (static + v-bind), default slot, named slots (`<template #name>`)
  - Spec: `vue-scene-builder`

- [ ] **T3.2** Create `src/renderer/builders/vue/module-builder.ts`
  - `createImportTracker()` — auto-append `.vue` extension, dedup, collision handling
  - `resolveMarkers()` — minimal (entities resolved inline)
  - `generateModule()` — CSF3 with `render: () => ({ components, template })`
  - Spec: `vue-scene-builder`

- [ ] **T3.3** Create `src/renderer/builders/vue/index.ts`
  - Barrel export: `vueModuleBuilder`, `vueComponentRenderer`, `vueRenderers`
  - Spec: `builder-directory-convention` (existing)

- [ ] **T3.4** Update `src/renderer/index.ts` — re-export vue builder symbols
  - Spec: `builder-directory-convention` (existing)

## Phase 4: Integration & Validation

- [ ] **T4.1** Create `packages/integrations/test-integration-react/`
  - Minimal React + Vite + Storybook + Designbook setup
  - 2-3 sample components, 1 scene file
  - `designbook.config.yml` with `frameworks.component: react`

- [ ] **T4.2** Create `packages/integrations/test-integration-vue/`
  - Minimal Vue 3 + Vite + Storybook + Designbook setup
  - 2-3 sample components, 1 scene file
  - `designbook.config.yml` with `frameworks.component: vue`

- [ ] **T4.3** Update `package.json` — `supportedFrameworks: ["html", "react", "vue3"]`

- [ ] **T4.4** Verify existing SDC integration still works (regression test)
  - Run `test-integration-drupal` scenes
  - Confirm no changes to SDC output
