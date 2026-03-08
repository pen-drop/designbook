# Tasks: rename-screen-to-scenes

## Already Done (from explore & skill work)
- [x] Rename `.agent/skills/designbook-screen` → `designbook-scenes`
- [x] Rewrite `designbook-scenes/SKILL.md` with new `.scenes.yml` format
- [x] Update `debo-design-shell.md` workflow references
- [x] Update `debo-design-screen.md` workflow references
- [x] Update `debo-run-promptfoo-test.md` references
- [x] Update `designbook-components-sdc/SKILL.md` cross-references

## Code Changes
- [x] `vite-plugin.ts` — change file detection from `.screen.yml` → `.scenes.yml`, rename `loadScreenYml` → `loadScenesYml`
- [x] `parser.ts` — update JSDoc comments
- [x] `types.ts` — update JSDoc comments
- [x] `preset.ts` — update glob pattern, regex, variable names, tags, and log messages
- [x] `03-design-system.mdx` — update `shell.screen.yml` → `shell.scenes.yml`
- [x] `main.js` — update stories glob patterns

## Data Migration
- [x] Migrate `shell/shell.screen.yml` → `shell/shell.scenes.yml`

## Specs
- [x] Update `openspec/specs/screen-renderer/spec.md`
- [x] Rename + update `openspec/specs/shell-screen/` → `shell-scenes/`
