# css-generate-stages Specification

## Purpose
CSS framework architecture: self-registering blueprints, token-to-CSS mapping, five-stage generation pipeline, and generic task contracts.

## Requirements

### Requirement: CSS framework skills self-register via css-mapping blueprint

Each CSS framework skill provides `blueprints/css-mapping.md` with `type: css-mapping` and `when: frameworks.css: <framework>`. Body contains a `groups:` YAML block mapping token groups to `prefix`, `wrap`, and `path`. The generic `generate-jsonata` task reads this blueprint.

- Tailwind: `designbook-css-tailwind/blueprints/css-mapping.md` with groups like `color: { prefix: color, wrap: "@theme", path: "semantic.color" }`
- DaisyUI: `wrap: '@plugin "daisyui/theme"'` with `meta` for theme attributes
- Custom frameworks: provide `css-mapping.md` with matching `when:` — no task files needed
- Unknown framework with no matching blueprint -> error reported

### Requirement: css-mapping blueprint scoped to generation steps

Uses `when: steps: [generate-jsonata, generate-css]`. Available during CSS generation but NOT during unrelated steps like `create-component`.

### Requirement: css-mapping groups declare token paths

Each group includes `path` (dot-separated token path in `design-tokens.yml`). Optional: `resolve: "var"` for CSS variable reference resolution, `expand: "typography"` for composite token expansion.

- `path: "component.container.max-width"` -> navigates to that token location
- `resolve: "var"` -> resolves references as `var(--color-*)` instead of hex values
- `expand: "typography"` -> expands composite tokens into individual CSS properties for fontSize, fontWeight, lineHeight

### Requirement: css-mapping groups only generate for present token groups

`generate-jsonata` checks which mapped groups exist in `design-tokens.yml` and only generates templates for present groups.

### Requirement: debo-css-generate uses five-stage architecture

Five stages in order: `intake` (`[css-generate:intake]`), `prepare` (`[prepare-fonts, prepare-icons]`), `generate` (`each: group`, `[generate-jsonata]`), `transform` (`[generate-css]`), `index` (`[generate-index]`).

- `generate` iterates per group via `each: group`
- `prepare` runs `prepare-fonts` if font extension configured; skipped otherwise
- After `generate` completes, engine flushes stashed files (`.debo` -> final extension), then `transform` begins
- After `transform` completes, `index` creates barrel file importing all `.src.css` files

### Requirement: Generic generate-css task

`designbook/css-generate/tasks/generate-css.md` (step: `generate-css`): runs all `.jsonata` files via `jsonata-w transform`, verifies output. Applies to all frameworks. Does NOT modify `app.src.css` or handle font downloads.

### Requirement: Generic generate-jsonata task reads css-mapping blueprint

`designbook/css-generate/tasks/generate-jsonata.md` (step: `generate-jsonata`): accepts `group` parameter, reads css-mapping for that group's config, generates one JSONata template file. Also generates theme override `.jsonata` files when `design-tokens.yml` contains a `themes:` section.

### Requirement: generate-index creates CSS barrel file

`designbook/css-generate/tasks/generate-index.md` (step: `generate-index`): generates `index.src.css` with one `@import` per `*.src.css` file (excluding itself), sorted alphabetically. Theme override files (e.g. `color.theme-dark.src.css`) cascade correctly via alphabetical ordering after their base files.

### Requirement: Font provider configured via extensions

Configured in `designbook.config.yml` under `extensions: google-fonts`. Font skills provide `tasks/prepare-fonts.md` with `when: extensions: google-fonts`.

- With extension: font task matches during `prepare` stage, downloads before `generate`
- Without extension: no task matches, `prepare` effectively skipped
- Font skill reads css-mapping's typography group to determine which fonts to load
