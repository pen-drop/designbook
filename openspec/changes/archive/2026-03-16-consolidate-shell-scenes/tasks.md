## 1. Remove standalone shell page and component

- [x] 1.1 Delete `packages/storybook-addon-designbook/src/pages/spec.shell.scenes.yml`
- [x] 1.2 Delete `DeboShellPage` component (`src/components/pages/DeboShellPage.jsx`)
- [x] 1.3 Remove `DeboShellPage` export from `src/components/pages/index.js`

## 2. Extend DeboDesignSystemPage with shell/layout section

- [x] 2.1 Add shell `DeboSection` to `DeboDesignSystemPage.jsx` — loads `design-system/design-system.scenes.yml`, shows description + scene grid, references `/debo-design-shell` command

## 3. Update vite-plugin shell detection

- [x] 3.1 Change shell path in status endpoint from `shell/spec.shell.scenes.yml` to `design-system/design-system.scenes.yml`
- [x] 3.2 Update layout inheritance resolution — `layout: "design-system:shell"` resolves to `design-system/*.scenes.yml` → scene named `shell`
- [x] 3.3 Remove any `shell/` directory scanning logic

## 4. Update workflow and skills

- [x] 4.1 Update `debo-design-shell` workflow (`.agent/workflows/debo-design-shell.md`) — output to `designbook/design-system/design-system.scenes.yml`, remove all `shell/` and `spec.shell.scenes.yml` references
- [x] 4.2 Update `designbook-scenes` skill (`.agent/skills/designbook-scenes/SKILL.md`) — replace shell file references with new path

## 5. Update specs and remaining references

- [x] 5.1 Update `openspec/specs/shell-scenes/spec.md`
- [x] 5.2 Update `openspec/specs/design-shell-workflow/spec.md`
- [x] 5.3 Update `openspec/specs/design-shell-react-components/spec.md`
- [x] 5.4 Grep for all remaining references to `spec.shell.scenes.yml` and `shell/` directory and update
