## Why

The workflow engine currently uses three separate mechanisms for task data flow: `files:` for writing files to disk, `--params` on `workflow done` for passing data between stages, and filesystem-based communication (draft JSON files) for fan-in patterns like compare→triage. This fragmentation means tasks have no typed contract for what they produce, the engine cannot validate data at stage boundaries, and inter-stage data flow relies on implicit conventions rather than explicit declarations. Additionally, `each:` iteration lives on the workflow stage rather than the task, making tasks non-self-documenting about their own data requirements.

## What Changes

- **BREAKING**: Task frontmatter `files:` is replaced by `result:` — a unified declaration for both file and data results, with JSON Schema validation via `$ref`
- **BREAKING**: `workflow write-file` CLI command is replaced by `workflow result` — handles both file results (stdin) and data results (`--json`)
- **BREAKING**: `workflow done` no longer accepts `--params` — data passing is handled by `workflow result` before calling `done`
- **BREAKING**: `each:` moves from workflow stage definitions to task frontmatter — tasks declare what they iterate over, including the schema of each item
- **BREAKING**: `params:` values must be inline JSON Schema objects (with `type` property) — old-format (`~`, `[]`, `{}`) is rejected at `workflow create` time
- New: `schemas.yml` files at the skill level define shared JSON Schema types referenced by tasks via `$ref` (relative or skill-qualified paths)
- New: Workflow scope — engine-managed shared data namespace where data results flow in at stage completion and task params are resolved from
- New: Stage completion as the trigger for collection and next-stage expansion (replaces per-task expansion)
- New: `RESPONSE:` JSON includes `stage_progress` and `stage_complete` fields
- Existing semantic validators (`component`, `scene`, `data-model`) continue to work alongside JSON Schema validation — both must pass for a result to be accepted

## Capabilities

### New Capabilities
- `task-result-schema`: Unified result declarations on tasks, skill-level schema definitions, scope-based data flow, stage-completion-driven expansion, and `workflow result` CLI command

### Modified Capabilities
- `workflow-execution`: Stage transitions occur at stage completion (all tasks done) rather than per-task. `workflow done` no longer accepts `--params`. New `workflow result` command replaces `workflow write-file`. Response JSON extended with stage progress fields.
- `workflow-format`: Task frontmatter gains `result:` (replaces `files:`), `each:` (replaces stage-level `each:`). `tasks.yml` gains `scope:` and `schemas:` fields. Stage-level `each:` deprecated with fallback.

## Impact

- **Part 2 (storybook-addon-designbook)**: CLI commands `workflow result` (new), `workflow done` (modified), `workflow write-file` (deprecated alias). Stage completion logic, scope management, schema resolution at create time, JSON Schema validation (ajv or similar dependency). tasks.yml format changes (scope, schemas, per-task result). Storybook panel Files tab must adapt to show `result:` entries.
- **Part 1 (core skill)**: All task files with `files:` must migrate to `result:`. All workflows with stage-level `each:` must migrate to task-level `each:`. New `schemas.yml` files created per concern (design, tokens, css-generate, etc.).
- **Part 3 (integration skills)**: Task files with `files:` (e.g. `designbook-drupal/components/tasks/create-component.md`) must migrate to `result:`. Integration schemas may reference core schemas via skill-qualified `$ref`.
- **Skill instructions (workflow-execution.md, task-format.md)**: Must be updated to document new `result:` / `workflow result` / scope model.
