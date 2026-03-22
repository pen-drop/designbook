## 1. Create designbook-workflow step files

- [x] 1.1 Create `steps/create.md` — workflow creation command, parameter docs, `$WORKFLOW_NAME` capture pattern
- [x] 1.2 Create `steps/update.md` — task status update command (`in-progress` / `done`)
- [x] 1.3 Create `steps/add-files.md` — `--files` registration, `requires_validation` explanation, must-be-before-done rule
- [x] 1.4 Create `steps/validate.md` — `workflow validate` command, JSON output format, fix loop until exit 0, must-run-before-done rule

## 2. Refactor designbook-workflow SKILL.md

- [x] 2.1 Remove `## CLI Commands` section (create / update / validate sub-sections)
- [x] 2.2 Add `## Steps` section linking to all four step files
- [x] 2.3 Remove `## Integration Pattern` inline bash — replace with prose referencing the step files
- [x] 2.4 Keep `## Task Types`, `## Directory Structure`, `## Task File Format`, `## Storybook Integration` unchanged

## 3. Create designbook-data-model validate step

- [x] 3.1 Create `steps/validate.md` — `validate data-model` CLI command, exit code handling, fix loop
- [x] 3.2 Update `SKILL.md`: remove `## Validation` section, add `validate` to `## Steps` list

## 4. Update debo-* workflows — remove all inline workflow tracking bash

- [x] 4.1 `debo-data-model.md` — replace inline `workflow create/update/validate` bash with `Load @designbook-workflow/steps/*.md` references
- [x] 4.2 `debo-sample-data.md` — same
- [x] 4.3 `debo-design-component.md` — same
- [x] 4.4 `debo-design-screen.md` — same
- [x] 4.5 `debo-design-shell.md` — same
- [x] 4.6 `debo-design-tokens.md` — same
- [x] 4.7 `debo-css-generate.md` — same
- [x] 4.8 `debo-export-product.md` — same
- [x] 4.9 `debo-sections.md` — same
- [x] 4.10 `debo-shape-section.md` — same
- [x] 4.11 `debo-screenshot-design.md` — same
- [x] 4.12 `debo-vision.md` — same

## 5. Replace all direct validate calls with skill references

- [x] 5.1 Audit every workflow for direct `designbook validate <type>` or `npx storybook-addon-designbook validate` calls
- [x] 5.2 Replace each direct `validate data-model` call with `Load @designbook-data-model/steps/validate.md`
- [x] 5.3 Verify no raw `node packages/storybook-addon-designbook/dist/cli.js validate` remains in any workflow — remaining references are in per-skill SKILL.md files (components-sdc, tokens, sample-data) for their own resource types; out of scope for this change
