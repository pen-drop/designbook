---
trigger:
  steps: [create-component]
filter:
  frameworks.component: sdc
---

# .component.yml Constraints

See `resources/component-yml.md` for the full how-to.

## Naming

- Component directory + file basenames: **kebab-case** (`nav-main/nav-main.*`).
- `group:` required, one of: `Action`, `Data Display`, `Navigation`, `Layout`, `Shell`.
- Components are visually descriptive, never domain-specific: `card` not `article-card`.

## Slot and Prop Keys — snake_case (hard rule)

Slot keys and prop keys MUST be snake_case. Hyphens silently break Twig because `{{ main-content }}` parses as subtraction and falls back to an empty value.

```yaml
slots:
  main_content: …     # ✅
  main-content: …     # ❌
props:
  is_sticky: …        # ✅
  is-sticky: …        # ❌
```

Story field names mirror these exactly (see `story-yml.md` rule).

## Three Files per Component

Every component has exactly three artifact types:

- `<name>.component.yml` — metadata + schema
- `<name>.twig` — markup (one file, all variants inline; see `twig.md` rule)
- `<name>.<variant>.story.yml` — one file per variant (see `story-yml.md` rule)

Stories never live inside `.component.yml`.

## Variants

Same props + same slots, different markup → single component with variants.
Different props or slots → separate components.

## Shell = UI

Shell components (header, footer, page) are full UI components with real HTML, in the same location and same provider as all other components.

## Resolve `DESIGNBOOK_COMPONENT_NAMESPACE` at Generation Time

Never leave the literal string in generated files. Substitute the actual value (e.g. `test_integration_drupal`) before writing.

## Error Handling

- Missing required parameter → report which parameter is missing.
- Invalid status → list valid options (`stable`, `experimental`, `deprecated`).
- Invalid group → list valid options (`Action`, `Data Display`, `Navigation`, `Layout`, `Shell`).
- Component already exists → ask before overwriting.
- Schema validation fails → show errors and fix before continuing.
