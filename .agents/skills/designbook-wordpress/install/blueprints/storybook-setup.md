---
trigger:
  steps: [setup-storybook]
filter:
  backend: wordpress
---

# Blueprint: WordPress Storybook Setup

A starting point for setting up Storybook in the theme. All paths are relative to the theme
directory (the install target). Components are plain Twig rendered by Twing; there is no
`storybook-addon-sdc`.

## Choose path

A `.storybook/` directory containing `main.js` or `main.ts` exists → **Extend**.
Otherwise → **Fresh**.

## Package manager

Use `pnpm add -D` when a `pnpm-lock.yaml` or `pnpm-workspace.yaml` exists in the theme
directory or any parent directory; otherwise `npm install -D`.

## Fresh

1. `package.json` missing → create it with `"private": true`, `"type": "module"` and the
   script `"storybook": "storybook dev"`; name = namespace with `_` replaced by `-`.
2. Add devDependencies: `storybook@^10`, `@storybook/html-vite@^10`,
   `@storybook/addon-docs@^10`, `storybook-addon-designbook`, `twing@^7.3.0`, `vite@^6`.
   When `storybook-addon-designbook` is not on the npm registry (development setups),
   install it from the local checkout that contains `packages/storybook-addon-designbook/`
   (walk up from the real path of `.agents/skills/`), as `file:<dir>/packages/storybook-addon-designbook`.
3. Write `.storybook/main.js`:

   ```js
   /** @type { import('@storybook/html-vite').StorybookConfig } */
   export default {
     stories: ['../components/*/*.story.yml'],
     addons: ['@storybook/addon-docs', { name: 'storybook-addon-designbook' }],
     framework: { name: '@storybook/html-vite', options: {} },
   };
   ```

   The designbook addon registers the Twig loader itself (namespace = `component.namespace`).
4. Ensure a `components/` directory exists.

## Extend

Touch nothing except the addon registration, the stories glob and missing dependencies:
append `{ name: 'storybook-addon-designbook' }` to `addons`, append
`'../components/*/*.story.yml'` to `stories`, and add missing `storybook-addon-designbook`,
`@storybook/addon-docs@^10`, `twing@^7.3.0`.
