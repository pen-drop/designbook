# tailwind-css-tokens Specification

## Purpose
Defines how `designbook-css-tailwind` maps design token groups to Tailwind v4 CSS output via `@theme` blocks, token naming, and the css-mapping blueprint.

## Requirements

### Requirement: Token group naming and CSS output
Each token group maps to `@theme` block custom properties via a css-mapping prefix:

| Group | Token path | CSS property | Markup usage |
|-------|-----------|--------------|-------------|
| layout-width | `component.container.max-width` | `--container-{name}` | Standard Tailwind utility |
| layout-spacing | `component.section.padding-y` | `--layout-spacing-{name}` | `py-[var(--layout-spacing-md)]` (non-standard, requires `var()`) |
| grid | `component.grid.gap` | `--grid-{name}` | `gap-[var(--grid-md)]` (non-standard, requires `var()`) |

Standard sizes suggested for layout-width: sm(640), md(768), lg(1024), xl(1280) -- user may customize.

### Requirement: CSS generation via @theme blocks
- Each token group produces a separate `.src.css` file with `@theme { --name: value; }` blocks
- Typography composite tokens (`expand: "typography"`) expand into: `--text-{name}`, `--text-{name}--weight`, `--text-{name}--line-height`

### Requirement: css-mapping blueprint
`blueprints/css-mapping.md` declares all supported groups with prefix, wrap, and path. Groups include: `primitive-color`, `color`, `radius`, `shadow`, `layout-width`, `layout-spacing`, `grid`, `typography`, `primitive-typography`, `typography-scale`.

- Standard namespaces (`--color-*`, `--radius-*`, `--shadow-*`, `--container-*`, `--font-*`, `--text-*`): Tailwind auto-generates utilities
- Non-standard namespaces (`--layout-spacing-*`, `--grid-*`): consumed via `var()`

### Requirement: css-naming blueprint
`blueprints/css-naming.md` defines three-layer token model:
- **Primitive**: raw values (colors use ~5-8 shades per hue, numbered 50-950; every primitive referenced by a semantic)
- **Semantic**: purpose-based, reference primitives (sizes use t-shirt scale: sm, md, lg, xl)
- **Component**: component-specific, reference semantics

### Requirement: DaisyUI prerequisite
`designbook-css-daisyui` declares `designbook-css-tailwind` as prerequisite. Tailwind loaded first; naming conventions come from Tailwind skill.

### Requirement: Breakpoint defaults
With `DESIGNBOOK_FRAMEWORK_CSS=tailwind`, intake suggests breakpoints: sm(640), md(768), lg(1024), xl(1280).

### Requirement: Semantic color var() resolution
css-mapping declares semantic color groups with `resolve: "var"`. Token `{primitive.color.blue-600}` produces `--color-name: var(--color-blue-600)` instead of concrete hex.
