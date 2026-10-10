# Tailwind CSS

`designbook-css-tailwind` supplies Tailwind v4 token naming and CSS generation via `@theme`. It is a marketplace plugin. The skill loads when `DESIGNBOOK_FRAMEWORK_CSS` includes `tailwind` (directly or via daisyui).

## Prerequisites

```yaml
frameworks:
  css: tailwind
```

`npx storybook-addon-designbook config` then prints `DESIGNBOOK_FRAMEWORK_CSS='tailwind'`. Observed on `fixtures/vue-storybook` and `fixtures/drupal-stitch`.

Install rules (`write-config`, `setup-storybook`) pre-select Tailwind and wire Vite, `app.src.css`, and dependencies when `filter: frameworks.css: tailwind` matches.

## What it contributes

- `rules/tailwind-naming.md` — naming for the tokens dialog (`layout-width`, `layout-spacing`, `grid`)
- `tasks/create-tokens.md` — fallback token file generation
- `rules/component-styling.md`, `component-source.md`, `css-mapping.md` — utility-first styling, source registration, token-group mapping for `generate-jsonata`
- CSS generation consumed by the core `css-generate` workflow (`prepare-fonts`, `generate-jsonata`, `generate-css`, `compile-css`, `guard-css`, `generate-index`)

Non-standard namespaces need `var()`:

```html
<div class="py-[var(--layout-spacing-md)]">...</div>
```

## Guard

After compile, `npx storybook-addon-designbook guard-css` probes a stylesheet for expected CSS variables and font families. Defaults: `--vars` and `--fonts` empty strings. See [guard-css](/advanced/cli/guard-css).

This integration does not replace [css-generate](/get-started/pipeline) or [configuration](/extend/configuration). Select `frameworks.css: tailwind`; do not add a fake `extensions: tailwind` unless you have a separate extension id.
