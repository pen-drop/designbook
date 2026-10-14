---
trigger:
  steps: [write-component, refresh-components, validate]
filter:
  frameworks.component: twig
---

# Twig Component Rules

The same `<name>.twig` renders under Twing in Storybook and under Timber in WordPress, so it
uses only what both runtimes share.

| ID | Constraint |
|---|---|
| TWIG-01 | Artefacts per component: `<name>.twig`, `<name>.schema.yml`, and at least `<name>.default.story.yml`; directory and file base names are kebab-case and equal. |
| TWIG-02 | The template has exactly one root element. |
| TWIG-03 | CSS classes come from the template itself and from props (an optional `class` prop); there is no `attributes` object. |
| TWIG-04 | Text props print escaped with `\|e`; slot variables print raw (they hold rendered HTML). |
| TWIG-05 | A nested component is included as `{% include '@<namespace>/<name>/<name>.twig' with { … } only %}`, `<namespace>` = `component.namespace`. |
| TWIG-06 | Only core Twig tags, filters and functions; Drupal or WordPress helpers (`t`, `create_attribute`, `attach_library`, `clean_class`, `function()`, `fn()`) stay out of components. |
| TWIG-07 | Prop and slot names are snake_case and identical in the template, `<name>.schema.yml` and every story. |

## Storybook story address

Component stories are indexed as `title = Components/{Human Name}`,
`id = sanitize(title)--sanitize(variant)`; `Human Name` is the directory name with each
segment capitalized and hyphens turned into spaces (`recipe-card` → `Components/Recipe Card`
→ `components-recipe-card--default`). `refresh-components.story_ids` and every `validate`
story address use these ids.
