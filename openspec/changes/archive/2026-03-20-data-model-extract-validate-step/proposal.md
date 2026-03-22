## Why

Workflow tracking logic (create/update/validate/add-files) is duplicated as inline bash commands across every `debo-*` workflow file. When the CLI changes, every workflow must be updated individually. Skills like `designbook-data-model` also inline their validation rather than exposing it as a composable step. Extracting each operation into a dedicated step file makes the system composable and maintainable.

## What Changes

- Extract `designbook-workflow` operations into step files: `create.md`, `update.md`, `validate.md`, `add-files.md`
- Extract `designbook-data-model` validation into `steps/validate.md`
- Update all `debo-*` workflows to reference step files instead of inlining bash commands
- Update `designbook-workflow/SKILL.md` to list steps and remove inline command examples

## Capabilities

### New Capabilities
- `workflow-steps`: Individual step files for each workflow tracking operation (`create`, `update`, `validate`, `add-files`) in `designbook-workflow/steps/` — referenceable by any workflow
- `data-model-validate-step`: Step file `designbook-data-model/steps/validate.md` encapsulating the data model schema validation command

### Modified Capabilities
- `workflow-skill`: `designbook-workflow/SKILL.md` becomes an orchestrator index; inline CLI examples move to step files
- `data-model-workflow`: `designbook-data-model/SKILL.md` steps section gets `validate` entry; inline section removed
- `design-shell-workflow`: `debo-design-shell.md` references step files instead of inline bash
- `data-model-workflow`: `debo-data-model.md` references step files instead of inline bash
- `sample-data-workflow`: `debo-sample-data.md` references step files instead of inline bash

## Impact

- `.agent/skills/designbook-workflow/steps/create.md` — new
- `.agent/skills/designbook-workflow/steps/update.md` — new
- `.agent/skills/designbook-workflow/steps/validate.md` — new
- `.agent/skills/designbook-workflow/steps/add-files.md` — new
- `.agent/skills/designbook-workflow/SKILL.md` — CLI sections replaced with step references
- `.agent/skills/designbook-data-model/steps/validate.md` — new
- `.agent/skills/designbook-data-model/SKILL.md` — inline validation removed, step listed
- All `.agent/workflows/debo-*.md` — inline workflow tracking bash replaced with step `Load` references
