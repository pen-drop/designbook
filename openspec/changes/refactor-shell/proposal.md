## Why

The current `design-shell` workflow produces a Markdown spec file (`design-shell/shell-spec.md`) that describes the application shell layout as prose. This is inconsistent with how all other UI elements work in Designbook — sections use `.screen.yml` + UI components. The shell cannot be visually previewed in Storybook as a rendered layout, only as a Markdown document.

## What Changes

- Replace `shell-spec.md` with a `shell.screen.yml` that composes a `page` component with `header` and `footer` components
- Create 3 new UI components: `page` (container with header/content/footer slots), `header` (navigation), `footer` (footer links)
- Update the `debo-design-shell` workflow to produce `shell.screen.yml` + components instead of a Markdown file
- Update `03-design-system.mdx` to show the rendered shell screen instead of parsed Markdown
- Update `DeboExportPage.jsx` completion check to look for `shell/shell.screen.yml`
- Extend the vite-plugin screen discovery to support `shell/*.screen.yml` (currently only discovers `sections/*/screens/`)
- Update promptfoo fixtures and rubrics to match the new output

## Capabilities

### New Capabilities
- `shell-screen`: The shell screen and page/header/footer component architecture

### Modified Capabilities
_None — this is a new capability replacing a Markdown-based approach._

## Impact

- **Addon**: `03-design-system.mdx`, `DeboExportPage.jsx`, `vite-plugin.ts` (screen discovery)
- **Workflow**: `.agent/workflows/debo-design-shell.md` (complete rewrite)
- **Skill**: `designbook-drupal-components` (page/header/footer component creation)
- **Testing**: `promptfoo/promptfooconfig.yaml` (shell rubric), `promptfoo/fixtures/debo-design-shell/`
- **Breaking**: `shell-spec.md` is removed; existing shell specs must be migrated
