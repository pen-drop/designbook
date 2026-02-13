## Context

The Designbook system generates Drupal SDC (Single Directory Component) design components in three layers: **UI components** (visual building blocks), **entity components** (structural wrappers mapping entity fields), and **screen components** (full page compositions).

Currently, entity components create **one slot per Drupal field**. The `loadDesignComponentYml` function in `vite-plugin.ts` only renders a text placeholder (component name + story name) — no actual HTML from the `.story.yml` is rendered.

The `renderer.js` file in the integration project defines a hook system (`storyNodesRenderer`) with an `appliesTo` + `render` pattern, currently only handling `type: 'icon'`. This is part of the `storybook-addon-sdc` ecosystem.

### Key Files

| File | Role |
|------|------|
| `.agent/skills/designbook-entity/SKILL.md` | Skill instructions for entity generation |
| `packages/storybook-addon-designbook/src/vite-plugin.ts` | Vite plugin: indexes + loads design `.component.yml` → CSF modules |
| `packages/storybook-addon-designbook/src/preset.ts` | Storybook preset: indexer for design components |
| `packages/integrations/test-integration-drupal/.storybook/renderer.js` | Integration-specific story node renderers (icon handler) |
| `designbook/sections/blog/data.json` | Sample data per section (entity_type → bundle → records[]) |
| `designbook/design/entity/node/article/entity-node-article.story.yml` | Current per-field-slot story |

## Goals / Non-Goals

**Goals:**
- Entity components use a **single `content` slot** instead of per-field slots
- Stories compose UI components via `type: component` nodes inside the `content` slot
- A simple `refRenderer.js` provides a data-resolver function: given a data context and a field path, returns the string value
- The `designbook-entity` skill generates stories that use `type: component` with prop values sourced from `data.json`
- A `designbook:` metadata block in story YAML declares the test data source
- The `loadDesignComponentYml` function renders stories as real HTML from `.story.yml` data

**Non-Goals:**
- Complex mapping logic in refRenderer — it just resolves field paths to values
- Runtime data fetching — all data comes from static `data.json` files
- Changing the UI component layer (heading, figure, etc.) — those remain unchanged
- Changing the shell or screen component structure

## Decisions

### D1: refRenderer.js is a simple data resolver

**Decision:** `refRenderer.js` exports a single function that takes a data context (loaded from `data.json`) and a field path (dot-notation), and returns the plain string value. No HTML, no component rendering, no mapping.

```js
// .storybook/refRenderer.js
export function resolveRef(data, fieldPath) {
  const parts = fieldPath.split('.');
  let value = data;
  for (const part of parts) {
    if (value == null) return undefined;
    value = value[part];
  }
  return value;
}
```

**Rationale:** Keep the renderer dead simple. All composition logic lives in the story YAML as `type: component` nodes. The refRenderer is just a helper that the vite-plugin calls when it needs to resolve a test data value during build-time story rendering.

### D2: Story YAML format with component composition

**Decision:** Entity stories compose UI components directly. Props reference test data values that the vite-plugin resolves at build time using `refRenderer.js`:

```yaml
designbook:
  testdata: designbook/sections/blog/data.json
  entity_type: node
  bundle: article
  record: 0  # optional, default 0

name: Full View
slots:
  content:
    - type: component
      component: 'daisy_cms_daisyui:heading'
      props:
        text: $ref:title
        level: h1
        preheadline: $ref:field_teaser_preheadline
    - type: component
      component: 'daisy_cms_daisyui:figure'
      props:
        src: $ref:field_media.url
        alt: $ref:field_media.alt
        full_width: true
    - type: component
      component: 'daisy_cms_daisyui:text-block'
      props:
        content: $ref:body
    - type: component
      component: 'daisy_cms_daisyui:contact-card'
      props:
        name: $ref:block_content.contact_person.0.field_name
        title: $ref:block_content.contact_person.0.field_title
        variant: author
    - type: component
      component: 'daisy_cms_daisyui:cta-banner'
      props:
        headline: "Sie benötigen Unterstützung?"
        variant: "ocean"
```

**Rationale:** The `$ref:` prefix in prop values signals the vite-plugin to resolve via refRenderer. Plain string values (without `$ref:`) are used as-is. This keeps the story fully declarative — you can read it and understand exactly what renders.

### D3: Entity .component.yml uses single `content` slot

**Decision:** Entity components have exactly one slot: `content`.

```yaml
name: entity_node_article
provider: designbook_design
slots:
  content:
    title: "Content"
    description: "All article content composed from UI components"
```

The Twig template becomes trivial:

```twig
<article{{ attributes.addClass(['entity-node-article']) }}>
  {{ content }}
</article>
```

### D4: Build-time rendering in vite-plugin.ts

**Decision:** The `loadDesignComponentYml` function:

1. Read `.component.yml` + `.story.yml`
2. If `designbook:` metadata exists, load `data.json` and extract the record
3. For each node in `slots.content[]`:
   - Resolve any `$ref:` prop values via `refRenderer.resolveRef(record, path)`
   - Pass resolved props to the SDC rendering pipeline (or generate approximated HTML for MVP)
4. Output as CSF `render()` function

**For MVP:** Component HTML is wrapped in `<div data-component="name">` with props applied as data attributes or inner content. Real Twig rendering via the existing `twing` pipeline is the eventual target.

## Risks / Trade-offs

- **[Breaking change] Existing entity components need regeneration** → Mitigated by updating the skill. Old components can be overwritten.
- **[Data dependency] Stories with `$ref:` props but no `data.json` render placeholders** → Acceptable with console warning.
- **[MVP limitation] No Twig rendering in stories** → Approximated HTML for v1. Real rendering follows.
