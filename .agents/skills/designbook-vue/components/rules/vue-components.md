---
trigger:
  steps: [write-component, refresh-components, validate]
filter:
  frameworks.component: vue
---

# Vue Component Rules

Format and logic constraints for the two Vue artefacts. Markup patterns and slot
conventions live in [schemas.yml](../schemas.yml).

## Global

### Naming

- Component directory + file basenames: **kebab-case** (`book-card/book-card.*`).
- **Slot names and prop names: camelCase**. `defineProps` keys and `<slot name>`
  attributes mirror these exactly.
- Filename matches directory name.
- Components visually descriptive, never domain-specific: `card` not `article-card`.

### Story Format Is Always YAML

Every story is a `.story.yml` file — the same flat, declarative format every other
designbook framework uses. Storybook's native CSF story format (`.stories.ts`,
`export const Default = {...}`) is never written for a designbook-managed component,
even though Storybook+Vue tooling defaults to it: the addon's own story indexer reads
`.story.yml`, not CSF, so a `.stories.ts` file next to a component is dead weight the
indexer never sees.

### Storybook story address

Freeze identity in the plan as `namespace` + `group` + `component` + `variant`. Derive
every CSF story id and story URL from that identity.

The Vue story indexer builds:

```text
title = Components/{Human Name}
id    = sanitize(title)--sanitize(variant)
```

`Human Name` is the kebab-case directory name with each segment capitalized and
hyphens turned into spaces (`signage-item` → `Signage Item`). `sanitize` is CSF
`toId`: lowercase, non-alphanumerics become `-`. Examples:

| component dir | variant | title | CSF story id |
|---|---|---|---|
| `signage` | `default` | `Components/Signage` | `components-signage--default` |
| `signage-item` | `default` | `Components/Signage Item` | `components-signage-item--default` |
| `book-card` | `sale` | `Components/Book Card` | `components-book-card--sale` |

`refresh-components.story_ids` and every `validate` / capture story address for
components written in this run use these derived ids. Retained fixture stories keep
the exact id already present in the live index.

### File Set

Required artefacts per component, all kebab-case:

- `<name>.vue` — the Single-File Component; the sole source of identity, props, and slots.
- `<name>.<variant>.story.yml` — one file per variant. Every component always ships at
  least `<name>.default.story.yml` so it has a Storybook entry and can be visually
  verified.

The SFC and its `.story.yml` files are the complete artefact set — no `.component.yml`
sidecar (see "Story Format Is Always YAML" above for the story format itself).

### YAML Quoting

Always double quotes (`"`) in every YAML file.

## .vue

- **Single-File Component** with a `<script setup>` block. No Options API, no separate
  `.js`/`.ts` component-definition file.
- **Typed `defineProps`** — declare the component's props through TypeScript type
  syntax or the runtime-props object form, never untyped `props: [...]`.
- **Named slots** for every structural child region — a component that composes other
  components exposes a `<slot name="...">` per region rather than accepting markup as a
  single default slot. Nested/repeated children (e.g. a list of cards) use a single
  named slot that the caller populates with one entry per item.
- **No hardcoded colors** — use CSS custom properties from design tokens or utility
  classes derived from them.
- **CSS framework routing**: read `@designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/SKILL.md`
  for class names. It is the single source of truth — do not invent class naming.
- **Slots over inline markup**: when markup contains other components or interactive
  elements, expose a slot — never inline component markup that could be composed by
  the caller instead.

## .story.yml

- **One file per variant**: `<name>.<variant>.story.yml`. Default story is
  `<name>.default.story.yml`. The name segment is mandatory — never `<name>.story.yml`.
- **Flat format** — top-level keys are `component`, `name`, `variant`, `props`,
  `slots`. A story file selects its variant through the top-level `variant` field.
  No `stories:` wrapper.
- **One story per file** — never combine multiple stories using `---` YAML document
  separators.
- **Story node `type:`** ∈ `element`, `component`, `image`.
- **Images** use root-relative paths to committed local assets under `public/`
  (`/images/cover.png`). Same local-asset contract as every other designbook story
  file (`local-image-assets`).
- **Component refs include the namespace prefix**: `<namespace>:<name>`, matching
  `designbook.config.yml` → `component.namespace`.
- **Visually distinct states** — every story file must show a meaningful visual
  difference. Stories that look identical (differ only in invisible props) are not
  allowed.
