## 1. Create designbook skill scaffold

- [x] 1.1 Create `designbook/` skill dir with SKILL.md (description, dispatch instructions, execution engine content from designbook-workflow)
- [x] 1.2 Create `designbook/tasks/` for shared tasks
- [x] 1.3 Create `designbook/rules/` for global rules
- [x] 1.4 Create `designbook/resources/` and move `designbook-workflow/resources/workflow-execution.md` and `cli-reference.md` into it

## 2. Migrate workflows

- [x] 2.1 Create `designbook/workflows/vision/` — `workflow.md` + `tasks/` + `rules/`
- [x] 2.2 Create `designbook/workflows/tokens/` — `workflow.md` + `tasks/` + `rules/`
- [x] 2.3 Create `designbook/workflows/data-model/` — `workflow.md` + `tasks/` + `rules/` + `resources/`
- [x] 2.4 Create `designbook/workflows/design-component/` — `workflow.md` + `tasks/`
- [x] 2.5 Create `designbook/workflows/design-screen/` — `workflow.md` + `tasks/`
- [x] 2.6 Create `designbook/workflows/design-shell/` — `workflow.md` + `tasks/`
- [x] 2.7 Create `designbook/workflows/design-guideline/` — `workflow.md` + `tasks/` + `rules/`
- [x] 2.8 Create `designbook/workflows/sections/` — `workflow.md` + `tasks/`
- [x] 2.9 Create `designbook/workflows/shape-section/` — `workflow.md` + `tasks/`
- [x] 2.10 Create `designbook/workflows/sample-data/` — `workflow.md` + `tasks/` + `resources/`
- [x] 2.11 Create `designbook/workflows/css-generate/` — `workflow.md` + `tasks/`
- [x] 2.12 Create `design/workflows/design-test.md` + `design/tasks/visual-diff--design-test.md` (testing/ concern removed)

## 3. Move shared tasks to skill root

- [x] 3.1 Move `create-component.md` to `designbook/tasks/` (shared by design-component + design-screen)
- [x] 3.2 Create `create-scene--design-screen.md`, `create-scene--design-shell.md`, `map-entity--design-screen.md`, `plan-entities--design-screen.md`, `plan-components--design-screen.md` in `design/tasks/`
- [x] 3.3 Move `generate-css.md` to `css-generate/tasks/`

## 4. Remove old skill dirs

- [x] 4.1 Remove `designbook-vision/`, `designbook-tokens/`, `designbook-data-model/`
- [x] 4.2 Remove `designbook-sample-data/`, `designbook-sections/`, `designbook-shape-section/`
- [x] 4.3 Remove `designbook-design-component/`, `designbook-design-screen/`, `designbook-design-shell/`
- [x] 4.4 Remove `designbook-guidelines/`, `designbook-scenes/`, `designbook-test/`
- [x] 4.5 Remove `designbook-css-generate/`, `designbook-promptfoo/` (promptfoo deleted entirely)
- [x] 4.6 Remove `designbook-workflow/`

## 5. Remove debo-*.md workflow files

- [x] 5.1 Remove all `.agents/workflows/debo-*.md` files

## 6. Update skill scan subdirs (CLI)

- [x] 6.1 Update `resolveTaskFile` to discover task files at `designbook/workflows/*/tasks/<stage>.md` via recursive glob
- [x] 6.2 Update `matchRuleFiles` to discover rule files at `designbook/workflows/*/rules/*.md` and `designbook/rules/*.md`

## 7. Update before: references

- [x] 7.1 Update execution engine to resolve `before: workflow: css-generate` as relative to `designbook/workflows/` (strip `/debo-` prefix logic)

## 8. Update promptfoo test configs

- [x] 8.1 Update all `promptfoo/configs/*.yaml` prompts — replace `/debo-<workflow>` with `/debo <workflow>`
- [x] 8.2 Update assertions — `archivedWorkflows['debo-*']` → `archivedWorkflows['<workflow-id>']`
- [x] 8.3 Update `promptfoo/skills/designbook-workflow/promptfooconfig.yaml` — replace skill load (`designbook-workflow` → `designbook`) + `--workflow-file` path to new structure (`vision/workflows/vision.md`)
- [x] 8.4 Rename `debo-design-tokens` config → `tokens` (workflow renamed)
- [x] 8.5 Update workspace dir names — `promptfoo/workspaces/debo-*/` → `promptfoo/workspaces/<workflow-id>/`
- [x] 8.6 Verify `promptfoo/scripts/generate-configs.mjs` — no changes needed (assembles configs dynamically)
- [x] 8.7 Verify `promptfoo/providers/claude-cli.mjs` — no changes needed (reads workflow IDs dynamically from tasks.yml)

## 9. Update addon-skills authoring docs

- [x] 9.1 Update `designbook-addon-skills/resources/skill-authoring.md` to reflect new structure and conventions
- [x] 9.2 Update `designbook-addon-skills/SKILL.md` conventions section
