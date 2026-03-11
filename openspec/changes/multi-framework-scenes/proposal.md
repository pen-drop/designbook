## Why

Designbook scenes (`*.scenes.yml`) are currently hardcoded to SDC/Twig rendering. The `ModuleBuilder` interface and `builder-directory-convention` spec already provide the abstraction point, but only one implementation exists (`builders/sdc/`). To support React and Vue projects, we need framework-specific builders and a config-driven dispatch mechanism.

The addon's Debo UI components (Manager panel, MDX pages) stay React — they run in Storybook's always-React contexts (manager iframe, addon-docs). Only the **scene rendering pipeline** needs multi-framework support.

## What Changes

### Phase 1: Refactor — Make SDC coupling explicit and removable

- **Config**: Add `frameworks.component` to `DesignbookConfig` interface (typed union: `'sdc' | 'react' | 'vue'`)
- **Vite plugin**: Replace hardcoded `buildSdcModule` fallback with config-driven builder resolution
- **CLI**: Extract `drupal.theme` dependency behind a framework guard — only required when `frameworks.component === 'sdc'`
- **Preset**: Make `.storybook` config directory resolution framework-aware (SDC derives from `drupal.theme`, React/Vue use project root)

### Phase 2: React builder

- `src/renderer/builders/react/module-builder.ts` — ES import tracking from project paths, JSX code generation
- `src/renderer/builders/react/renderer.ts` — ComponentSceneNode → `<Component {...props}>{children}</Component>`
- `src/renderer/builders/react/index.ts` — barrel export with `reactRenderers` array
- Scene component references use project-relative import paths: `@/components/Header` or `./src/components/Header`
- Slots map to `children` (default slot) or render-prop patterns (named slots)
- Entity rendering inlines JSX expressions (no marker system needed — React can evaluate at render time)

### Phase 3: Vue builder

- `src/renderer/builders/vue/module-builder.ts` — ES import tracking with `.vue` extension, Vue template generation
- `src/renderer/builders/vue/renderer.ts` — ComponentSceneNode → `<Component v-bind="props"><slot /></Component>`
- `src/renderer/builders/vue/index.ts` — barrel export with `vueRenderers` array
- CSF render returns `{ components, template }` object (Vue 3 Storybook convention)
- Slots map to Vue named slots (`<template #slotName>`)

### Phase 4: Integration testing

- Create `test-integration-react/` with a minimal React + Storybook + Designbook setup
- Create `test-integration-vue/` with a minimal Vue 3 + Storybook + Designbook setup
- Verify scenes render correctly in each framework
- Update `supportedFrameworks` in `package.json` to `["html", "react", "vue3"]`

## Capabilities

### New Capabilities

- `react-scene-builder`: Render `*.scenes.yml` as React/JSX stories via `builders/react/` ModuleBuilder
- `vue-scene-builder`: Render `*.scenes.yml` as Vue 3 template stories via `builders/vue/` ModuleBuilder
- `framework-dispatch`: Config-driven builder resolution based on `frameworks.component` setting

### Modified Capabilities

- `designbook-configuration`: Add typed `frameworks.component` field with `'sdc' | 'react' | 'vue'`
- `screen-renderer`: Vite plugin uses config to select builder instead of hardcoding SDC
- `addon-cli`: CLI commands guard framework-specific options behind config checks
- `story-validation`: Vitest plugin selection becomes framework-aware (SDC dedup plugin only for SDC)

## Impact

- `src/config.ts` — typed `frameworks.component` in `DesignbookConfig`
- `src/vite-plugin.ts` — config-driven builder dispatch
- `src/cli.ts` — framework guards on `drupal.theme` usage
- `src/preset.ts` — framework-aware config dir resolution
- `src/renderer/builders/react/` — new directory (3 files)
- `src/renderer/builders/vue/` — new directory (3 files)
- `src/renderer/index.ts` — re-exports for new builders
- `packages/integrations/test-integration-react/` — new test project
- `packages/integrations/test-integration-vue/` — new test project
- `package.json` — `supportedFrameworks` update

## Scene Format Examples

### React

```yaml
name: "Sections/Blog"
layout: "shell"

scenes:
  - name: "Article List"
    layout:
      content:
        - component: "@/components/Heading"
          props: { level: "h1" }
          slots: { children: "Blog" }
        - entity: node.article
          view_mode: teaser
          records: [0, 1, 2]
```

### Vue

```yaml
name: "Sections/Blog"
layout: "shell"

scenes:
  - name: "Article List"
    layout:
      content:
        - component: "@/components/Heading.vue"
          props: { level: "h1" }
          slots: { default: "Blog" }
        - entity: node.article
          view_mode: teaser
          records: [0, 1, 2]
```

### SDC (unchanged)

```yaml
name: "Sections/Blog"
layout: "shell"

scenes:
  - name: "Article List"
    layout:
      content:
        - component: mytheme:heading
          props: { level: h1 }
          slots: { text: "Blog" }
        - entity: node.article
          view_mode: teaser
          records: [0, 1, 2]
```

Note: The scene YAML structure is identical across frameworks. Only `component:` reference format and `slots:` key naming differ.
