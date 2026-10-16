---
trigger:
  steps: [setup-storybook]
filter:
  frameworks.component: react
---

# React Storybook Wiring

React components render inside the addon's `@storybook/html-vite` host: the addon mounts
each story's React tree into a DOM container and keeps every Designbook page, overlay and
highlight on the same DOM contract. All paths are relative to the install target.

## Dependencies

Add devDependencies (same package-manager pick as the backend setup):
`@storybook/html-vite@^10`, `@storybook/addon-themes@^10`, `react@^19`, `react-dom@^19`, `@types/react@^19`,
`@types/react-dom@^19`, `@vitejs/plugin-react@^4`, `typescript@^5`. React 18 (`^18`, with
matching `@types`) is supported as well.

## .storybook/main.ts

`framework` is `{ name: '@storybook/html-vite', options: {} }` — the addon stops Storybook
with an error naming `@storybook/html-vite` for any other framework.

Register `@vitejs/plugin-react` once, in the config's single `viteFinal` (merge into an
existing `viteFinal` rather than adding a second one); the addon stops the build with an
error when it is missing:

```ts
import react from '@vitejs/plugin-react';

async viteFinal(config) {
  const { mergeConfig } = await import('vite');
  return mergeConfig(config, { plugins: [react()] });
},
```

Add `'../components/*/*.story.yml'` to `stories` and `'@storybook/addon-themes'` to `addons` (the
toolbar that switches the design-token themes).

## tsconfig.json

Missing → create it with `"jsx": "react-jsx"`, `"module": "ESNext"`,
`"moduleResolution": "Bundler"`, `"strict": true`, `"skipLibCheck": true`, and
`"include": ["components"]`.
