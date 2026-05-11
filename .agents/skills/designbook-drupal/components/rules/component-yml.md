---
trigger:
  steps: [create-component]
filter:
  frameworks.component: sdc
---

# .component.yml Constraints

See `resources/component-yml.md` for the full how-to.

## Naming (authoritative — `twig.md` and `story-yml.md` defer to this)

- Component directory + file basenames: **kebab-case** (`nav-main/nav-main.*`).
- **Slot keys and prop keys: snake_case** (hard). Story field names and Twig variable references mirror these exactly — hyphens silently break Twig (`{{ main-content }}` parses as subtraction and falls back to empty).
- `group:` required, one of: `Action`, `Data Display`, `Navigation`, `Layout`, `Shell`.
- Components are visually descriptive, never domain-specific: `card` not `article-card`.

## File Set

Three artifact types per component:

- `<name>.component.yml` — metadata + schema (this file)
- `<name>.twig` — markup, one file, all variants inline (see `twig.md`)
- `<name>.<variant>.story.yml` — one file per variant (see `story-yml.md`)

Stories never live inside `.component.yml`.

## Variants

Same props + same slots, different markup → single component with variants. Different props or slots → separate components.

## Shell = UI

Shell components (header, footer, page) are full UI components with real HTML, same location and provider as all other components.

## `DESIGNBOOK_COMPONENT_NAMESPACE`

Substitute the literal string with the resolved namespace value before writing the file.

## Error Handling

- Missing required parameter → report which.
- Invalid status → list valid options (`stable`, `experimental`, `deprecated`).
- Invalid group → list valid groups.
- Component already exists → ask before overwriting.
- Schema validation fails → show errors and fix.
