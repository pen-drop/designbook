---
name: install
description: Tailwind-specific designbook install steps, dispatched from a backend integration's install flow.
---

# Designbook Install — Tailwind CSS

Dispatched by the backend install flow after Storybook and `designbook.config.yml`
exist in the install target. All paths are relative to the install target
(`THEME_DIR` for Drupal). Assumes a Vite-based Storybook setup.

## Detection

Suggest this skill as the default choice when either holds for the install target:

- `package.json` lists `tailwindcss` under `dependencies` or `devDependencies`
- any `*.css` file under the target contains `@import "tailwindcss"` or `@tailwind`

Detection only pre-selects — the user always confirms the CSS framework choice in
the backend flow.

## Steps

1. Add devDependencies (same package-manager pick as the backend flow):
   `tailwindcss@^4`, `@tailwindcss/vite@^4`.
2. `.storybook/main.js` — add with the other `import` statements at the top of the file:

   ```js
   import tailwindcss from '@tailwindcss/vite'
   ```

   and add to the `config` object, after the `framework` entry (when no `framework` key exists — extend path on a custom setup — add it as the last property of the config object):

   ```js
   async viteFinal(config) {
     const { mergeConfig } = await import('vite')
     return mergeConfig(config, {
       plugins: [tailwindcss()],
     })
   },
   ```

When the config already has a `viteFinal`, do not add a second one — add `tailwindcss()` to the plugins of the existing `viteFinal`'s merge/return instead.

3. `.storybook/preview.js` — add as the first line:

   ```js
   import '../css/app.src.css'
   ```

4. `css/app.src.css` missing → create it:

   ```css
   @import "tailwindcss";
   ```

5. `designbook.config.yml` — set the `css` key nested under `frameworks:` to
   `tailwind`, and append to the top-level `extensions` list:

   ```yaml
   - id: tailwind
     skill: designbook-css-tailwind
   ```
