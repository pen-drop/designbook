---
trigger:
  steps: [write-component, refresh-components, validate]
filter:
  frameworks.component: react
---

# React Component Rules

Format and portability constraints for the two React artefacts. The TSX and story
contracts (exports, props, region mapping, node vocabulary) live in
[schemas.yml](../schemas.yml).

## Global

### File Set

Per component, all kebab-case:

- `<name>.tsx` — the component; sole source of identity, props, and regions.
- `<name>.<variant>.story.yml` — one file per variant; every component ships at least
  `<name>.default.story.yml`.

Stories are always `.story.yml` — the addon's story indexer reads only that format, so a
native CSF file (`.stories.tsx`) next to a component is never indexed.

### Storybook story address

Freeze identity in the plan as `namespace` + `group` + `component` + `variant`; derive every
CSF story id and story URL from it:

```text
title = Components/{Human Name}
id    = sanitize(title)--sanitize(variant)
```

`Human Name` is the kebab-case directory name with each segment capitalized and hyphens
turned into spaces; `sanitize` is CSF `toId`. `price-badge` + `sale` →
`components-price-badge--sale`. Retained fixture stories keep the id already present in the
live index.

### YAML Quoting

Always double quotes (`"`) in every YAML file.

## .tsx — portable presentational component

The same source runs unchanged in Storybook and in Next.js App Router, imported from
server or client components. Each component is a pure function of its props:

- **Synchronous function component**, default-exported, with its exported typed props.
  Inputs arrive only through props; output is JSX.
- **Imports** only `react` types and sibling components under `components/`.
- **Regions as `ReactNode` props** — `children` for the `children` slot, an identically
  named prop per named slot; render each region exactly where its content belongs.
- **Local, deterministic logic only** — formatting and conditional markup from props.
- **Serializable JSX attributes** — strings, numbers, booleans, style objects and nested
  elements, so the component renders as a server component; interactivity (`onClick`,
  `onChange`, callbacks) is wired by the consuming app around the component.
- Application state, data loading, routing and event orchestration belong to the consuming
  app. A component therefore uses no hooks, no `async`, no `'use client'`/`'use server'`
  directives, no event-handler or function props, no `fetch`, no browser globals
  (`window`, `document`), and no framework modules such as `next/image` or `next/link`; images are `<img>`, links are `<a>`.
- **Semantic, accessible markup** — native elements (`button`, `a`, `nav`, headings in
  order), `alt` on images, labels for controls.
- **No hardcoded colors** — design tokens or utility classes derived from them. Class names
  come from `@designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/SKILL.md` via `className`.

## .story.yml

- One file per variant, `<name>.<variant>.story.yml`; the name segment is mandatory.
- Flat format selecting its variant through the top-level `variant` field.
- Story node `type:` ∈ `element`, `component`, `image`; component refs carry the namespace
  prefix from `designbook.config.yml` → `component.namespace`.
- Images use root-relative paths to committed local assets under `public/`.
- Every story file shows a meaningful visual difference from the others.
