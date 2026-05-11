---
trigger:
  steps: [create-component]
filter:
  frameworks.component: sdc
---

# .story.yml Constraints

See `resources/story-yml.md` for the full how-to. Naming spec (field keys mirror `.component.yml`) lives in `component-yml.md`.

- **One file per variant**: `<name>.<variant>.story.yml`. Default is `<name>.default.story.yml`. Stories never live inside `.component.yml`.
- **Story node `type:`** is one of `element` (raw HTML), `component` (embedded component, referenced as `<namespace>:<name>`), or `image`.
- **Placeholder images** use service URLs (`https://placehold.co/600x400`). Local file paths are not served by Storybook.
- **`DESIGNBOOK_COMPONENT_NAMESPACE`** substituted at write time (see `component-yml.md`).
