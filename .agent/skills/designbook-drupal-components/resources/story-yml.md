# Part 2: Generate .story.yml

Stories are written as a **separate `.story.yml`** file using the SDC Storybook format.

> ⛔ **CRITICAL RULE**: Stories must **NEVER** be placed inside `.component.yml`. Always generate a separate `.story.yml` file.

> ⛔ **FORMAT RULE**: The `.story.yml` uses a **flat format** — no `stories:` wrapper. Top-level keys are `name`, `props`, and `slots`.

> ⛔ **NAMING RULE**: The filename must match the directory name. Component in `components/nav-main/` → file is `nav-main.story.yml`. Always kebab-case.

## Build Story YAML

**Structure:**
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
$DESIGNBOOK_DRUPAL_THEME/components/[componentNameKebab]/[componentNameKebab].story.yml
```

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

```yaml
name: Preview
props:
  variant: default
slots:
  text:
    - type: element
      tag: 'span'
      value: 'Submit'
    - type: image
      uri: https://placehold.co/16x16
  content:
    - type: component
      component: 'umami:card'
    - type: component
      component: 'umami:card'
      props:
        html_tag: 'div'
      slots:
        content: 'Hello from nested card!'
```

## Default Story Generation

When generating a component, always create a story that:
1. Uses default prop values (from the prop definitions)
2. Fills each slot with a representative `element` node
3. Provides a basic but complete rendering of the component
