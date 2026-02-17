# Part 2: Generate .story.yml

Stories are written as **separate `.story.yml`** files using the SDC Storybook format.

> ⛔ **CRITICAL RULE**: Stories must **NEVER** be placed inside `.component.yml`. Always generate separate `.story.yml` files.

> ⛔ **FORMAT RULE**: Each `.story.yml` uses a **flat format** — no `stories:` wrapper. Top-level keys are `name`, `props`, and `slots`.

> ⛔ **ONE STORY PER FILE**: Each meaningful story must be its own file. **Never combine multiple stories into one file using `---` YAML document separators.**

## File Naming Convention

> ⛔ **MANDATORY**: Every story file **must** include a name segment: `[component-name].[story-name].story.yml`. Use `default` as the story name for the primary/single story.

Each story file follows the pattern: `[component-name].[story-name].story.yml`

| Scenario | File name |
|----------|-----------|
| Single / default story | `footer.default.story.yml` |
| Variant story | `card.vertical.story.yml`, `card.horizontal.story.yml` |
| Multiple stories | `button.default.story.yml`, `button.outline.story.yml` |

> **Rule**: Every story file uses `[component-name].[story-name].story.yml` — **always** with a name segment. Use `default` for the primary story. This ensures the `story:` key in cross-references is always predictable (derived from the filename middle segment).

**Directory example (multi-variant):**
```
components/card/
├── card.component.yml
├── card.twig
├── card--vertical.twig
├── card--horizontal.twig
├── card.vertical.story.yml     ✅ one file per story
├── card.horizontal.story.yml   ✅ one file per story
```

**Directory example (single story):**
```
components/footer/
├── footer.component.yml
├── footer.twig
├── footer.default.story.yml    ✅ uses "default" as story name
```

**❌ WRONG — multiple stories in one file:**
```
components/card/
├── card.story.yml              ❌ contains both stories separated by ---
```

## Build Story YAML

**Structure (one story per file):**
```yaml
name: [story name]
props:                    # optional, override props for this story
  [propName]: [value]
slots:                    # optional, define slot content
  [slotName]:
    - type: element
      value: [text or HTML]
    - type: component
      component: '[provider]:[componentName]'
    - type: image
      uri: [url]
```

**Write to file:**
```
$DESIGNBOOK_DRUPAL_THEME/components/[componentNameKebab]/[componentNameKebab].[storyName].story.yml
```

> If `storyName` is not specified or the component has a single story, use `default` as the story name.

## Story Node Types

There are 3 core story node types:

**`element`** — Embed HTML markup:
```yaml
- type: element
  value: 'Hello World!'
  tag: 'h2'           # optional, defaults to inline text
  attributes:          # optional
    class: custom-class
```

**`component`** — Nest other SDC components:
```yaml
- type: component
  component: 'provider:component-name'
  props:               # optional, override props
    html_tag: 'div'
  slots:               # optional, override slots
    content: 'Custom content'
```

**`image`** — Embed images:
```yaml
- type: image
  uri: https://placehold.co/600x400
  attributes:          # optional
    class: custom-class
```

## Full Example

Single-story component (`badge.default.story.yml`):
```yaml
name: default
props:
  label: 'Drupal'
```

Multi-story component (`card.vertical.story.yml`):
```yaml
name: Vertical
props:
  variant: vertical
  title: 'Example Title'
slots:
  media:
    - type: image
      uri: https://placehold.co/600x400
```

## Visually Meaningful Stories

Each story should demonstrate a **distinct visual state** of the component. Don't create stories that look identical — every story file should show a meaningful visual difference.

**Good story candidates:**
- **Variant stories** — one per layout variant (e.g., `card.vertical`, `card.horizontal`)
- **Content length extremes** — short title vs. long title, with/without optional fields
- **State stories** — empty slots, missing optional props, different color schemes
- **Context stories** — component as used in a real page scenario (e.g., `hero.with-image`, `hero.text-only`)

**Bad story candidates (avoid):**
- Stories that look identical but differ only in invisible props
- Stories that duplicate the default with trivial text changes

**Example — button component stories:**
```
button.default.story.yml    → filled primary button
button.outline.story.yml    → outlined border-only button
```

**Example — card component stories:**
```
card.vertical.story.yml     → stacked image-on-top layout
card.horizontal.story.yml   → side-by-side image-and-text layout
```

## Default Story Generation

When generating a component, always create a story that:
1. Uses default prop values (from the prop definitions)
2. Fills each slot with a representative `element` node
3. Provides a basic but complete rendering of the component
4. Lives in its **own file** — one story per `.story.yml` file
5. Shows a **visually distinct state** — each story must look different from the others
