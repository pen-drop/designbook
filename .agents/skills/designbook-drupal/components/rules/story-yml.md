---
trigger:
  steps: [create-component]
filter:
  frameworks.component: sdc
---

# .story.yml Constraints

See `resources/story-yml.md` for the full how-to.

## One File per Variant

Each variant lives in its own file: `<name>.<variant>.story.yml`. The default story is `<name>.default.story.yml`. Stories never live inside `.component.yml`.

## Field Names Mirror `.component.yml`

Story field keys (slot/prop overrides) use the EXACT snake_case names declared in `.component.yml`. Mismatches silently produce empty values when Twig renders the variable:

```yaml
# .component.yml declares:
slots:
  main_content: …

# .story.yml — must match
slots:
  main_content: [ … ]     # ✅
  main-content: [ … ]     # ❌  empty in Twig
```

See `component-yml.md` rule for the naming spec.

## Story Node Types

Slot values are arrays of nodes. Allowed `type:` values:

- `element` — raw HTML element
- `component` — embedded component
- `image` — image source

```yaml
slots:
  hero:
    - type: component
      component: <namespace>:button
      props:
        label: Click me
```

## Placeholder Images

Use placeholder service URLs only — Storybook does not serve local file paths:

```yaml
- type: image
  uri: https://placehold.co/600x400     # ✅
  uri: /images/sample/photo.jpg         # ❌
```

## `DESIGNBOOK_COMPONENT_NAMESPACE`

Substitute the actual namespace value at write time. Component embeds reference as `<namespace>:<name>` (see `component-yml.md` rule).
