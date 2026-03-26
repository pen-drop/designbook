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
├── {{ component }}.default.story.yml
└── {{ component }}.[variant-name].story.yml 
```

## Variant Story Files

> ⛔ **Each variant MUST have its own `.story.yml` file.** The `.default.story.yml` is always created (tracked by the workflow). For components with variants, additionally create one `{{ component }}.[variant-id].story.yml` per variant and register each with `workflow add-file --workflow $WORKFLOW_NAME --task <id> --file <path>`.
>
> ```
> # Example: navigation with variants main + footer
> navigation.default.story.yml   ← tracked by workflow (always)
> navigation.main.story.yml      ← add via workflow add-file
> navigation.footer.story.yml    ← add via workflow add-file
> ```

## File Generation Order

Generate in three phases across **all components** before moving to the next phase.

**Build order within each phase:** Scan each component's `.twig` file for Twig include/embed directives — `{% include %}`, `{% embed %}`, and `{{ component() }}`, and and `{{ include() }}` calls that reference other project components. Build components with no such dependencies first (leaf components), then components that include them. This ensures that when a composing component's Twig is written, all included components already exist.

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
> component: "test_integration_drupal:header"
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
