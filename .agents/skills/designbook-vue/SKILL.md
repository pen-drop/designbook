---
name: designbook-vue
disable-model-invocation: true
user-invocable: false
description: >-
  Vue Single-File-Component integration for Designbook — component creation for
  projects with `frameworks.component: vue`.
---

# Designbook — Vue

Integration skill for `frameworks.component: vue` projects, parallel to
`designbook-drupal`'s SDC integration. Independent of `backend` — extends Part 1
(`designbook` core) only.

## Components

Rules, tasks, and schemas for creating Vue Single-File Components
(`when: frameworks.component: vue`).

- [components/schemas.yml](components/schemas.yml) — `VueComponent` / `VueStory` /
  `VueStoryNode` — naming, slot conventions, YAML quoting (single source)
- [components/tasks/write-component.md](components/tasks/write-component.md) —
  Complete Vue artefacts (`.vue` SFC + `.default.story.yml`) for a selected component
  and requested delta
- [components/rules/vue-components.md](components/rules/vue-components.md) —
  Constraints for `.vue` and `.story.yml` (global naming + per-file-type rules)

The Vue runtime (`vue`, `@vitejs/plugin-vue`) ships as an optional peer dependency of
`storybook-addon-designbook`; a `frameworks.component: vue` project installs it
alongside the addon.

## Setup

The addon does not auto-inject `@vitejs/plugin-vue` into Storybook's Vite config —
register it in the project's own `.storybook/main.ts` `viteFinal`:

```ts
import vuePlugin from '@vitejs/plugin-vue';

async viteFinal(config) {
  const { mergeConfig } = await import('vite');
  return mergeConfig(config, { plugins: [vuePlugin()] });
},
```
