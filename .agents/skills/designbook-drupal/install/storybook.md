---
name: storybook
description: Set up Storybook in the theme — fresh from templates, or extend an existing instance.
---

# Storybook — set up or extend

All paths are relative to `THEME_DIR`.

## Choose path

A `.storybook/` directory containing `main.js` or `main.ts` exists → **Extend**.
Otherwise → **Fresh**.

## Fresh

1. `package.json` missing → create it:

   ```json
   {
     "name": "__NAMESPACE__",
     "private": true,
     "type": "module",
     "scripts": {
       "storybook": "storybook dev -p 6006"
     }
   }
   ```

   (substitute `__NAMESPACE__` with the `NAMESPACE` value, then replace every `_` with `-` in the `"name"` field only.)
   Existing → only add the `storybook` script when absent.
2. Add devDependencies (use `pnpm add -D` when a `pnpm-lock.yaml` or
   `pnpm-workspace.yaml` exists in `THEME_DIR` or a parent directory; otherwise
   `npm install -D`): `storybook@^10`, `@storybook/html-vite@^10`,
   `@storybook/addon-docs@^10`, `@storybook/addon-themes@^10`, `marked@^17`,
   `storybook-addon-sdc@^0.22.0`, `storybook-addon-designbook`, `twing@^7.3.0`,
   `vite@^6`.

   When `storybook-addon-designbook` is not available on the npm registry
   (development setups), install it from a local checkout instead:
   `npm install -D file:<path-to>/packages/storybook-addon-designbook`.
3. Copy every file from this skill's `install/templates/` into `.storybook/`,
   then post-process each copied file:
   - replace every `__NAMESPACE__` with the `NAMESPACE` value
4. Ensure a `components/` directory exists (create it empty if needed).

## Extend

Touch nothing except the two addon registrations and missing dependencies.

1. In the existing `.storybook/main.js`/`main.ts` `addons` array, append the
   entries that are not yet present (replace `__NAMESPACE__` with `NAMESPACE`;
   quote the object key when the namespace is not a valid JS identifier):

   ```js
   { name: 'storybook-addon-designbook' },
   {
     name: 'storybook-addon-sdc',
     options: {
       sdcStorybookOptions: {
         twigLib: 'twing',
         namespace: '__NAMESPACE__',
       },
       vitePluginTwingDrupalOptions: {
         namespaces: {
           __NAMESPACE__: ['../components'],
         },
       },
     },
   },
   ```

2. Ensure `"../components/**/*.component.yml"` is in the `stories` globs; append
   it when missing.
3. Add missing devDependencies: `storybook-addon-designbook`,
   `@storybook/addon-docs@^10`, `storybook-addon-sdc@^0.22.0`, `twing@^7.3.0`.
4. Leave every other setting untouched.
