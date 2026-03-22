---
when:
  frameworks.component: sdc
params:
  component: ~
  slots: []
  props: []
  group: ~
  variants: []
files:
  - ${DESIGNBOOK_DRUPAL_THEME}/components/{{ component }}/{{ component }}.component.yml
  - ${DESIGNBOOK_DRUPAL_THEME}/components/{{ component }}/{{ component }}.twig
  - ${DESIGNBOOK_DRUPAL_THEME}/components/{{ component }}/{{ component }}.default.story.yml
reads:
  - path: $DESIGNBOOK_DIST/design-system/design-tokens.yml
    workflow: debo-design-tokens
---

# Create SDC Component

Creates three files per component in `$DESIGNBOOK_DRUPAL_THEME/components/{{ component }}/`. All files share the same kebab-case base name as the directory.

## Output

```
$DESIGNBOOK_DRUPAL_THEME/components/{{ component }}/
├── {{ component }}.component.yml
├── {{ component }}.twig
└── {{ component }}.default.story.yml    (or .[variant-name].story.yml per variant)
```

## File Generation Order

Generate in three phases across **all components** before moving to the next phase. Within each phase, process leaf components first (those that don't nest others), then composing components.

1. **Phase 1 — ALL `.twig` files** — read `resources/twig.md` + `@designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/SKILL.md` once
2. **Phase 2 — ALL `.story.yml` files** — read `resources/story-yml.md` once
3. **Phase 3 — Each `.component.yml` + validate** — read `resources/component-yml.md` once; validate each component immediately after writing

The CSS skill is only needed in Phase 1. Validation runs after each component YAML via `workflow validate --task`.

## YAML Quoting Rule

> ⛔ **Always use double quotes (`"`) in all generated YAML files.** Never use single quotes (`'`).
> Single quotes cause parsing errors in the SDC Storybook addon. This applies to `.component.yml`, `.story.yml`, and `.scenes.yml`.
>
> ```yaml
> # Correct
> component: "test_integration_drupal:header"
> value: "Hello World"
>
> # Wrong — causes parser errors
> component: 'test_integration_drupal:header'
> value: 'Hello World'
> ```

## Layout Components

> ⛔ **MANDATORY**: When the component `group` is `Layout`, you **MUST** read `resources/layout-reference.md` before generating any files. Layout components (`container`, `grid`, `section`) have fixed definitions — copy them exactly from the reference. Do not invent layout component structures.

## Resources

Read the relevant resource file at the start of each phase:

- `resources/twig.md` — Twig template rules
- `resources/story-yml.md` — Story YAML structure
- `resources/component-yml.md` — Component YAML structure
- `resources/component-patterns.md` — Drupal-specific component patterns (navigation) and slot/variant/prop detection heuristics
- `resources/layout-reference.md` — **Required** for `group: Layout` components — fixed definitions for `container`, `grid`, `section`

> ⛔ **MANDATORY**: Change the app css after a new component is created. It must be changed to see changes!
