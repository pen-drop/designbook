## Why

The addon has two overlapping page entries — `spec.shell.scenes.yml` (Application Shell) and `design-system.scenes.yml` (Design System). Shell is part of the design system, not a peer. The shell concept should be absorbed into the design system: the workflow generates a `design-system.scenes.yml` (analogous to how it currently generates `spec.shell.scenes.yml`) that contains the layout scenes with header/content/footer slots. No separate shell file needed.

## What Changes

- **BREAKING**: Remove `spec.shell.scenes.yml` entirely (both built-in page in `src/pages/` and user-generated in `designbook/shell/`)
- **BREAKING**: Remove the `designbook/shell/` directory convention — shell data moves to `designbook/design-system/`
- `debo-design-shell` workflow generates `designbook/design-system/design-system.scenes.yml` instead of `designbook/shell/spec.shell.scenes.yml`
- `DeboDesignSystemPage` loads the generated `design-system.scenes.yml` for shell layout display (description + scene grid) alongside tokens
- `design-system.scenes.yml` built-in page file in `src/pages/` stays as-is (it's the page registration)
- Section scenes `layout: "design-system:shell"` inheritance updates to reference the new file location
- All references across skills, workflows, specs, and vite-plugin updated

## Capabilities

### New Capabilities

- `design-system-shell-section`: Design System page gains shell sub-section that displays layout scenes from `designbook/design-system/design-system.scenes.yml`

### Modified Capabilities

- `shell-scenes`: Shell scene file moves from `designbook/shell/spec.shell.scenes.yml` to `designbook/design-system/design-system.scenes.yml` — format stays the same, location and naming changes
- `design-shell-workflow`: Workflow outputs to new path, no standalone shell page

## Impact

- **User projects**: Must regenerate shell via `/debo-design-shell` (writes to new path)
- **Addon pages**: `src/pages/spec.shell.scenes.yml` deleted, `DeboShellPage` removed
- **React components**: `DeboDesignSystemPage` extended with shell section
- **Vite plugin**: Shell path detection updated from `shell/spec.shell.scenes.yml` to `design-system/design-system.scenes.yml`
- **Scene inheritance**: Section scenes change from `layout: "shell"` to `layout: "design-system:shell"`
- **Skills/workflows**: `debo-design-shell`, `designbook-scenes` updated
