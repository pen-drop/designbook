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

Generate in three phases across **all components** before moving to the next phase:

1. **Phase 1 — ALL `.twig` files** — read `resources/twig.md` + `@designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/SKILL.md` once
2. **Phase 2 — ALL `.story.yml` files** — read `resources/story-yml.md` once
3. **Phase 3 — Each `.component.yml` + validate** — read `resources/component-yml.md` once; validate each component immediately after writing before proceeding to the next

The CSS skill is only needed in Phase 1. Validation runs after each component YAML via `workflow validate --task`.

## Resources

Read the relevant resource file at the start of each phase:

- `resources/twig.md` — Twig template rules
- `resources/story-yml.md` — Story YAML structure
- `resources/component-yml.md` — Component YAML structure
- `resources/component-patterns.md` — Slot/variant/prop detection heuristics (read before parsing requirements)

For shell components (page, header, footer): read `resources/shell-generation.md`.
For layout components: read `resources/layout-reference.md`.
