## Design: Multi-Framework Scene Rendering

### Architecture Overview

```
designbook.config.yml
  frameworks.component: react | vue | sdc
         │
         ▼
┌─ vite-plugin.ts ──────────────────────────────────┐
│  resolveBuilder(config)                            │
│    ├─ 'sdc'   → import('builders/sdc')             │
│    ├─ 'react' → import('builders/react')           │
│    └─ 'vue'   → import('builders/vue')             │
└────────────────────┬───────────────────────────────┘
                     │
                     ▼
┌─ scene-module-builder.ts (unchanged) ─────────────┐
│  buildSceneModule(yaml, builder, renderers)        │
│    1. Parse YAML → SceneNode[]                     │
│    2. builder.createImportTracker()                 │
│    3. Render nodes via SceneNodeRenderService       │
│    4. builder.resolveMarkers()                      │
│    5. builder.generateModule() → CSF string         │
└────────────────────────────────────────────────────┘
```

---

### Decision: Component Reference Format

**Per-framework conventions in `component:` field:**

| Framework | Format | Example |
|-----------|--------|---------|
| SDC | `provider:component` | `mytheme:heading` |
| React | Project import path | `@/components/Heading` |
| Vue | Project import path + `.vue` | `@/components/Heading.vue` |

The builder's `createImportTracker()` handles resolution. No change to the scene parser — it treats `component:` as an opaque string passed to the builder.

**Alias resolution**: `@/` maps to the project's `src/` directory (standard Vite alias). Relative paths (`./components/Heading`) also work. The builder generates ES import statements directly — Vite resolves the actual paths.

---

### Decision: Slot Mapping

| Framework | Default Slot | Named Slots |
|-----------|-------------|-------------|
| SDC | Varies (component-defined) | `slots: { text: "..." }` |
| React | `children` | Props with JSX values |
| Vue | `default` | `<template #name>` |

React example — slots in scene YAML:
```yaml
- component: "@/components/Card"
  props: { variant: "outlined" }
  slots:
    children: "Card content"
    header:
      - component: "@/components/Badge"
        props: { label: "New" }
```

Generated JSX:
```jsx
<Card variant="outlined" header={<Badge label="New" />}>
  Card content
</Card>
```

Vue example — same YAML:
```yaml
- component: "@/components/Card.vue"
  props: { variant: "outlined" }
  slots:
    default: "Card content"
    header:
      - component: "@/components/Badge.vue"
        props: { label: "New" }
```

Generated template:
```html
<Card variant="outlined">
  <template #default>Card content</template>
  <template #header><Badge label="New" /></template>
</Card>
```

---

### Decision: Entity Rendering Strategy

SDC uses a two-pass marker system (`__ENTITY_EXPR__...__END_ENTITY_EXPR__`) because Twig needs string interpolation.

**React and Vue don't need markers.** They can inline expressions directly:

**React:**
```jsx
// Entity node.article record 0, view_mode teaser
<ArticleTeaser {...sampleData.node.article[0]} />
```

**Vue:**
```html
<ArticleTeaser v-bind="sampleData.node.article[0]" />
```

The entity renderer needs a framework-aware output mode:
- SDC: string markers (resolved in second pass)
- React: JSX expression strings (inlined during render)
- Vue: template expression strings (inlined during render)

This can be handled in each builder's `resolveMarkers()` — React/Vue implementations can be near-empty since entities are resolved inline during rendering.

---

### Decision: CSF Module Generation

**React CSF:**
```js
import React from 'react';
import Heading from '@/components/Heading';
import ArticleTeaser from '@/components/ArticleTeaser';

const sampleData = { /* loaded from data.yml */ };

export default {
  title: 'Sections/Blog/Article List',
  tags: ['scene'],
};

export const ArticleList = {
  render: () => (
    <>
      <Heading level="h1">Blog</Heading>
      <ArticleTeaser {...sampleData.node.article[0]} />
      <ArticleTeaser {...sampleData.node.article[1]} />
    </>
  ),
};
```

**Vue CSF:**
```js
import Heading from '@/components/Heading.vue';
import ArticleTeaser from '@/components/ArticleTeaser.vue';

const sampleData = { /* loaded from data.yml */ };

export default {
  title: 'Sections/Blog/Article List',
  tags: ['scene'],
  component: {},
};

export const ArticleList = {
  render: () => ({
    components: { Heading, ArticleTeaser },
    data: () => ({ sampleData }),
    template: `
      <Heading level="h1">Blog</Heading>
      <ArticleTeaser v-bind="sampleData.node.article[0]" />
      <ArticleTeaser v-bind="sampleData.node.article[1]" />
    `,
  }),
};
```

---

### Decision: Config Shape

```yaml
# designbook.config.yml

dist: ./designbook
frameworks:
  component: react        # 'sdc' | 'react' | 'vue'
  css: tailwind           # unchanged
```

- `drupal.theme` only required when `frameworks.component: sdc`
- `technology` field deprecated in favor of `frameworks.component`

---

### Decision: Builder Resolution in Vite Plugin

```typescript
// vite-plugin.ts — simplified
async function resolveBuilder(config: DesignbookConfig): Promise<{
  moduleBuilder: ModuleBuilder;
  renderers: SceneNodeRenderer[];
}> {
  const framework = config['frameworks.component'] || 'sdc';

  switch (framework) {
    case 'react': {
      const { reactModuleBuilder, reactRenderers } = await import('./renderer/builders/react');
      return { moduleBuilder: reactModuleBuilder, renderers: reactRenderers };
    }
    case 'vue': {
      const { vueModuleBuilder, vueRenderers } = await import('./renderer/builders/vue');
      return { moduleBuilder: vueModuleBuilder, renderers: vueRenderers };
    }
    case 'sdc':
    default: {
      const { sdcModuleBuilder, sdcRenderers } = await import('./renderer/builders/sdc');
      return { moduleBuilder: sdcModuleBuilder, renderers: sdcRenderers };
    }
  }
}
```

Dynamic imports so non-used builders are not bundled.

---

### Refactoring: SDC Decoupling

Before adding new builders, these files need SDC-specific code behind guards:

**`cli.ts`** — Currently reads `drupal.theme` unconditionally:
```typescript
// Before: always reads drupal.theme
const drupalTheme = config['drupal.theme'];
const provider = basename(drupalTheme).replace(/-/g, '_');

// After: only when framework is SDC
if (config['frameworks.component'] === 'sdc') {
  const drupalTheme = config['drupal.theme'];
  // ... SDC-specific validation
}
```

**`preset.ts`** — Derives `.storybook` dir from `drupal.theme`:
```typescript
// Before: assumes drupal.theme exists
const storybookDir = resolve(config['drupal.theme'], '.storybook');

// After: framework-aware
const storybookDir = config['frameworks.component'] === 'sdc'
  ? resolve(config['drupal.theme'], '.storybook')
  : resolve(projectRoot, '.storybook');
```

**`vitest-plugin-sdc.ts`** — Only loaded when framework is SDC:
```typescript
// vite-plugin.ts
if (framework === 'sdc') {
  plugins.push(...sdcVitestPlugins());
}
```

---

### Storybook Framework Compatibility

The addon needs to work with different Storybook renderers:

| `frameworks.component` | Storybook Package | Renderer |
|------------------------|-------------------|----------|
| `sdc` | `@storybook/html-vite` | HTML |
| `react` | `@storybook/react-vite` | React |
| `vue` | `@storybook/vue3-vite` | Vue 3 |

`supportedFrameworks` in `package.json` becomes `["html", "react", "vue3"]`.

The addon's **manager** and **MDX pages** always use React (Storybook provides this). Only the **story rendering** in the preview iframe changes per framework.

---

### File Changes Summary

**Modify:**
- `src/config.ts` — type `frameworks.component`
- `src/vite-plugin.ts` — builder dispatch
- `src/cli.ts` — framework guards
- `src/preset.ts` — framework-aware paths
- `src/renderer/index.ts` — re-exports
- `package.json` — `supportedFrameworks`

**Create:**
- `src/renderer/builders/react/module-builder.ts`
- `src/renderer/builders/react/renderer.ts`
- `src/renderer/builders/react/index.ts`
- `src/renderer/builders/vue/module-builder.ts`
- `src/renderer/builders/vue/renderer.ts`
- `src/renderer/builders/vue/index.ts`
- `packages/integrations/test-integration-react/`
- `packages/integrations/test-integration-vue/`

**No change:**
- `src/renderer/scene-module-builder.ts` (framework-agnostic core)
- `src/renderer/types.ts` (interfaces sufficient as-is)
- `src/renderer/render-service.ts` (generic dispatch)
- `src/renderer/entity-renderer.ts` (generic JSONata)
- `src/components/` (Debo UI — stays React)
- `src/onboarding/` (MDX — stays React)
