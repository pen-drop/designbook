---
when:
  steps: [create-component]
  frameworks.component: sdc
params:
  component: { type: string }
  slots: { type: array, default: [] }
  props: { type: array, default: [] }
  group: { type: string }
  variants: { type: array, default: [] }
result:
  component-yml:
    path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.component.yml
    $ref: designbook-drupal/components/schemas.yml#/ComponentYml
  component-twig:
    path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.twig
  component-story:
    path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.default.story.yml
    $ref: designbook-drupal/components/schemas.yml#/StoryYml
  app-css:
    path: ${DESIGNBOOK_CSS_APP}
each:
  component:
    $ref: designbook/design/schemas.yml#/Component
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    workflow: debo-design-tokens
---

# Create SDC Component

Creates three files per component. All files share the same kebab-case base name as the directory.

## Variant Story Files

> ⛔ **Each variant MUST have its own `.story.yml` file.** The `.default.story.yml` is always created (tracked by the workflow). For components with variants, additionally create one `{{ component }}.[variant-id].story.yml` per variant. Write variant story files directly to disk alongside the tracked default story.
>
> ```
> # Example: navigation with variants main + footer
> navigation.default.story.yml   ← tracked by workflow (always)
> navigation.main.story.yml      ← written directly to disk
> navigation.footer.story.yml    ← written directly to disk
> ```

## Design Hint

When `design_hint` is present in params (passed via `each: component` expansion from intake), use it as the primary design input for template generation. The hint contains landmark-specific data:

- **`rows`**: Array of `{bg, height}` objects describing visual rows/sections
- **`fonts`**: Per-element font specifications (e.g. `{nav: "Reef 22px", cta: "Reef 22px"}`)
- **`interactive`**: Array of `{element, color, radius}` objects for interactive patterns

Prefer hint values over generic defaults. When `design_hint` is absent, fall back to other params (`description`, `styles`, `fonts`).

## Inspection Phase (Before Generation)

Before generating any files, inspect the existing codebase:

1. **Read existing components** that this component will embed or include (check slots, props, and template patterns of dependencies)
2. **Identify composition relationships** — which components will be used via `{% embed %}`, `{% include %}`, or `{{ include() }}`

After all files are generated:

3. **Verify Storybook renders** the component — open the Storybook URL and confirm the default story renders without errors
4. If rendering fails, diagnose and fix before declaring the task done

## File Generation Order

Generate in three phases across **all components** before moving to the next phase.

**Build order within each phase:** Scan each component's `.twig` file for Twig include/embed directives — `{% include %}`, `{% embed %}`, and `{{ component() }}`, and and `{{ include() }}` calls that reference other project components. Build components with no such dependencies first (leaf components), then components that include them. This ensures that when a composing component's Twig is written, all included components already exist.

1. **Phase 1 — ALL `.twig` files** — read `resources/twig.md` + `@designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/SKILL.md` once
2. **Phase 2 — ALL `.story.yml` files** — read `resources/story-yml.md` once
3. **Phase 3 — Each `.component.yml` + validate** — read `resources/component-yml.md` once; validate each component immediately after writing

The CSS skill is only needed in Phase 1.

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

## Resources

Read the relevant resource file at the start of each phase:

- `resources/twig.md` — Twig template rules
- `resources/story-yml.md` — Story YAML structure
- `resources/component-yml.md` — Component YAML structure
- `resources/component-patterns.md` — Drupal-specific component patterns (navigation) and slot/variant/prop detection heuristics

## App CSS Update

> This section applies only when a CSS framework integration (e.g. `designbook-css-tailwind`) is active. The framework's rules handle the specifics of how to register component directories for class scanning.
