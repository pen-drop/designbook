---
name: storybook
description: Set up Storybook in the theme — fresh from templates, or extend an existing instance.
---

# Storybook — set up or extend

All paths are relative to `THEME_DIR`.

## CSS framework detection

Set `CSS_FRAMEWORK` to `tailwind` when either holds, otherwise `css`:

- `package.json` lists `tailwindcss` under `dependencies` or `devDependencies`
- any `*.css` file under the theme contains `@import "tailwindcss"` or `@tailwind`

## Choose path

A `.storybook/` directory containing `main.js` or `main.ts` exists → **Extend**.
Otherwise → **Fresh**.

## Fresh

1. `package.json` missing → create it:

   ```json
   {
     "name": "NAMESPACE",
     "private": true,
     "type": "module",
     "scripts": {
       "storybook": "storybook dev -p 6006"
     }
   }
   ```

   (`"name"` = the `NAMESPACE` value, `_` replaced by `-`.)
   Existing → only add the `storybook` script when absent.
2. Add devDependencies (use `pnpm add -D` when a `pnpm-lock.yaml` or
   `pnpm-workspace.yaml` exists in `THEME_DIR` or a parent directory; otherwise
   `npm install -D`): `storybook@^10`, `@storybook/html-vite@^10`,
   `@storybook/addon-docs@^10`, `storybook-addon-sdc@^0.22.0`,
   `storybook-addon-designbook`, `twing@^7.3.0`, `vite@^6`.
   When `CSS_FRAMEWORK` is `tailwind`, additionally: `tailwindcss@^4`,
   `@tailwindcss/vite@^4`.
3. Copy every file from this skill's `install/templates/` into `.storybook/`,
   then post-process each copied file:
   - replace every `__NAMESPACE__` with the `NAMESPACE` value
   - `CSS_FRAMEWORK` ≠ `tailwind` → delete every block between
     `// [tailwind-only] start` and `// [tailwind-only] end` including the marker
     lines; `CSS_FRAMEWORK` = `tailwind` → delete only the marker lines.
4. Ensure a `components/` directory exists (create it empty if needed).
5. `CSS_FRAMEWORK` = `tailwind` and `css/app.src.css` missing → create it:

   ```css
   @import "tailwindcss";
   ```

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
   `storybook-addon-sdc@^0.22.0`, `twing@^7.3.0`.
4. Leave every other setting untouched.
