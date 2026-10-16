---
name: designbook-react
disable-model-invocation: true
user-invocable: false
description: >-
  React (TSX) component integration for Designbook projects with
  `frameworks.component: react`, backend-independent.
---

# Designbook — React

Integration skill for `frameworks.component: react`, parallel to `designbook-vue` and the
SDC integration in `designbook-drupal`. Independent of `backend` — extends Part 1
(`designbook` core) only.

## Components

Schemas, task, and rule for presentational React components
(`filter: frameworks.component: react`).

- [components/schemas.yml](components/schemas.yml) — `ReactComponent` / `ReactStory` /
  `ReactStoryNode` (single source for the TSX and story contracts)
- [components/tasks/write-component.md](components/tasks/write-component.md) — complete
  React artefacts (`.tsx` + `.default.story.yml`) for a selected component and requested delta
- [components/rules/react-components.md](components/rules/react-components.md) — naming,
  slot mapping, portability limits, story format

## Install

- [install/rules/react-storybook.md](install/rules/react-storybook.md) — html-vite host,
  React/ReactDOM, `@vitejs/plugin-react` wiring for the `setup-storybook` step
