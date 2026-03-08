# Spec: shell-screen

## Overview

The shell screen provides the application-wide layout container. It composes a `page` component with `header`, `content`, and `footer` slots, producing a visual preview in Storybook.

## Requirements

### Components

1. **page** component
   - Slots: `header`, `content`, `footer`
   - Full viewport height with sticky header and bottom-anchored footer
   - Content area fills remaining space

2. **header** component
   - Props: `logo` (string), `nav_items` (array of {label, href}), `cta` (optional {label, href})
   - Responsive: hamburger menu on mobile

3. **footer** component
   - Props: `links` (array of {label, href}), `copyright` (string), `social` (optional array of {icon, href})

### Screen File

- Located at `designbook/shell/shell.screen.yml`
- Contains `docs` field with layout pattern, responsive behavior, design notes
- Storybook renders the screen on Canvas tab, docs on Docs tab

### Storybook Integration

- Vite plugin discovers `shell/*.screen.yml` (new glob path alongside existing `sections/*/screens/`)
- Screen title maps to `Designbook/Shell/{name}`
- The `docs` field is passed to CSF `parameters.docs.description.story`
- `03-design-system.mdx` removes the Application Shell DeboSection, replaces with a story link
- `DeboExportPage.jsx` checks `shell/shell.screen.yml` for completion instead of `design-shell/shell-spec.md`

### Workflow

- `debo-design-shell.md` workflow produces `shell.screen.yml` + ensures page/header/footer components exist
- If components don't exist, the workflow creates them using `designbook-drupal-components` skill conventions
- The workflow asks the same design questions (layout pattern, navigation, responsive) but writes a screen + components instead of a Markdown file

### Backward Compatibility

- `design-shell/shell-spec.md` is removed — this is a **breaking** change
- No migration tool needed (manual re-run of `/design-shell` sufficient)
