---
trigger:
  steps: [setup-storybook]
filter:
  frameworks.css: tailwind
---

# Tailwind Storybook Wiring

Tailwind wiring into the Storybook setup never varies per site, so it is a hard
constraint. All paths are relative to the install target; this assumes a Vite-based
Storybook setup.

## Dependencies

Add devDependencies (same package-manager pick as the backend setup): `tailwindcss@^4`,
`@tailwindcss/vite@^4`.

## .storybook/main.js

Add with the other `import` statements at the top of the file:

```js
import tailwindcss from '@tailwindcss/vite'
```

Add to the `config` object, after the `framework` entry (when no `framework` key
exists — extend path on a custom setup — add it as the last property of the config
object):

```js
async viteFinal(config) {
  const { mergeConfig } = await import('vite')
  return mergeConfig(config, {
    plugins: [tailwindcss()],
  })
},
```

When the config already has a `viteFinal`, do not add a second one — merge
`tailwindcss()` into the plugins of the existing `viteFinal` instead.

## .storybook/preview.js

Add as the first line:

```js
import '../css/app.src.css'
```

## css/app.src.css

Missing → create it:

```css
@import "tailwindcss";
```

## designbook.config.yml

Set the `css` key nested under `frameworks:` to `tailwind`, and append to the
top-level `extensions` list:

```yaml
- id: tailwind
  skill: designbook-css-tailwind
```
