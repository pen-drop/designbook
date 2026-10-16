# React

`designbook-react` adds React as a component framework (`frameworks.component: react`). It works without a backend and is backend-independent. Components are presentational TSX files with declarative `.story.yml` stories.

## Setup

```yaml
frameworks:
  component: react
```

Storybook runs on `@storybook/html-vite`. The addon mounts each React story into a DOM container, so the Designbook pages, the inspect overlay and the Structure highlights behave as they do for SDC and Vue. Install `react`, `react-dom` (18 or 19), their `@types`, `@vitejs/plugin-react` and `typescript`. Register the plugin in `.storybook/main.ts`:

```ts
import react from '@vitejs/plugin-react';

export default {
  stories: ['../components/*/*.story.yml'],
  addons: ['@storybook/addon-docs', '@storybook/addon-themes', { name: 'storybook-addon-designbook' }],
  framework: { name: '@storybook/html-vite', options: {} },
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');
    return mergeConfig(config, { plugins: [react()] });
  },
};
```

Storybook stops with an error if:

- the framework is not `@storybook/html-vite`, or
- `@vitejs/plugin-react` is not registered.

`react` and `react-dom` are optional peer dependencies of `storybook-addon-designbook`. SDC, Vue and Twig projects do not install them.

`@storybook/react-vite` is not supported by this integration. The DOM contract it would need is tracked separately.

## Component contract

- `components/<name>/<name>.tsx` default-exports a synchronous PascalCase function and exports its `<Name>Props` type.
- The `children` slot maps to the React `children` prop. Each named slot maps to a `ReactNode` prop with the same name.
- Stories are `components/<name>/<name>.<variant>.story.yml` (`component`, `name`, `variant`, `props`, `slots`). Story ids are `components-<name>--<variant>`.

## Portability

Components are pure functions of their props. They use:

- no hooks,
- no `async`,
- no `'use client'` / `'use server'` directives,
- no data fetching,
- no browser globals,
- no `next/*` imports,
- no event handlers or function props (the consuming app wires interactivity).

Because of this, the same source compiles unchanged in a Next.js App Router page, both in server and in client components. `packages/integrations/test-integration-react/next-consumer` proves this with a build.

## Known limitation

Designbook brackets every rendered component with two inert `<template>` anchors. It uses them to place the `db:s:`/`db:e:` markers that drive inspection and highlighting. Grid, flex and table layout are unaffected.

Structural selectors do count the anchors as element siblings. In Storybook, `:first-child`, `:last-child`, `:nth-child` and sibling combinators can therefore match an anchor. This matters when a region's items are separate components. In that case Tailwind's `space-y-*`, `divide-*` and `first:`/`last:` variants render differently than in the Next.js output. Use `gap-*` on flex or grid containers instead.
