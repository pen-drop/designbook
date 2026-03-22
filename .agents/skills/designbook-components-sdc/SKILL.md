---
name: Designbook Drupal Components
description: Creates Drupal SDC component files (.component.yml, .story.yml, and .twig) from structured component definition. Load this skill when DESIGNBOOK_FRAMEWORK_COMPONENT is sdc. Used when building UI components.
---

# Designbook Components — SDC

Creates Drupal Single Directory Component (SDC) files for UI components. Three files per component: `.component.yml`, `.twig`, `.[story-name].story.yml`.

## Files per Component

| File | Reference | Description |
|------|-----------|-------------|
| `.component.yml` | [`resources/component-yml.md`](resources/component-yml.md) | SDC metadata: props, slots, variants |
| `.twig` | [`resources/twig.md`](resources/twig.md) | Twig template |
| `.[story-name].story.yml` | [`resources/story-yml.md`](resources/story-yml.md) | Storybook story — always a separate file, never inside `.component.yml` |

## Task Files

- [create-component.md](tasks/create-component.md) — Creates all three files; phase-based generation with per-component validation

## Rules

- [sdc-conventions.md](rules/sdc-conventions.md) — Naming, slot rules, variants, placeholder images, error handling

## Resources

| Resource | Description |
|----------|-------------|
| `resources/twig.md` | Twig template structure and rules |
| `resources/story-yml.md` | Story YAML structure |
| `resources/component-yml.md` | Component YAML structure |
| `resources/component-patterns.md` | Slot/variant/prop detection heuristics |
| `resources/layout-reference.md` | Layout components — full definitions for container, grid, section |
