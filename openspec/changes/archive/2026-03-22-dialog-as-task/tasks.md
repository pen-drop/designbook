## 1. Rename dialog → intake

- [x] 1.1 Rename `dialog` → `intake` in all `.agents/workflows/debo-*.md` `stages:` arrays
- [x] 1.2 Rename `dialog` → `intake` in all `.agents/skills/*/rules/*.md` `when.stages` arrays
- [x] 1.3 Rename `debo-*:dialog` → `debo-*:intake` keys in `designbook.config.yml` under `workflow.rules`

## 2. Update workflow-execution.md

- [x] 2.1 Remove Rule 2 (Dialog Bootstrap) from `.agents/skills/designbook-workflow/rules/workflow-execution.md`
- [x] 2.2 Update Rule 1 (Resume Check) references from `dialog` to `intake`
- [x] 2.3 Update Rule 3 (Workflow Plan) to skip `intake` stage (same as it skipped `dialog`)
- [x] 2.4 Update Rule 5b to explicitly include intake stage in uniform processing

## 3. CLI: validate passes for empty files

- [x] 3.1 Update `workflow validate` in `packages/storybook-addon-designbook/src/cli.ts` to exit 0 when task has `files: []`

## 4. Create intake.md task files

- [x] 4.1 Create `.agents/skills/designbook-guidelines/tasks/intake.md` with `reads: [guidelines.yml]` and `files: []`
- [x] 4.2 Create `.agents/skills/designbook-tokens/tasks/intake.md` with `reads: [vision.md, guidelines.yml]` and `files: []`
- [x] 4.3 Create `.agents/skills/designbook-data-model/tasks/intake.md` with `reads: [vision.md]` and `files: []`
- [x] 4.4 Create `.agents/skills/designbook-vision/tasks/intake.md` with `files: []` (no required reads)
- [x] 4.5 Create `.agents/skills/designbook-sections/tasks/intake.md` with `reads: [vision.md]` and `files: []`

## 5. Update skill rule files

- [x] 5.1 Update `when.stages` in `.agents/skills/designbook-guidelines/rules/guidelines-context.md`: `debo-*:dialog` → `debo-*:intake`
- [x] 5.2 Update `when.stages` in `.agents/skills/designbook-css-tailwind/rules/tailwind-naming.md`: `debo-design-tokens:dialog` → `debo-design-tokens:intake`
- [x] 5.3 Update `when.stages` in `.agents/skills/designbook-css-daisyui/rules/daisyui-naming.md`: `debo-design-tokens:dialog` → `debo-design-tokens:intake`
- [x] 5.4 Update any remaining `dialog` references in `.agents/skills/designbook-workflow/resources/`
