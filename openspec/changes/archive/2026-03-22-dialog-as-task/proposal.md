## Why

The dialog phase of `debo-*` workflows is treated as a special pre-plan phase governed by Rule 2 — a prose-based bootstrap instruction that is easy to skip. This special-casing means dialog has no `reads:` enforcement, no reliable rule loading, and no uniform task tracking. Skills cannot reliably hook into the dialog phase without being explicitly referenced in the workflow file.

## What Changes

- **BREAKING**: `dialog` stage renamed to `intake` across all workflow stages, rule `when.stages`, and `designbook.config.yml` keys
- `intake` becomes a normal task with `files: []` in the stage pipeline
- Skills provide `intake.md` task files that hook into the intake stage like any other stage
- `reads:` in `intake.md` frontmatter enforces required files via Rule 5a (hard stop)
- `workflow validate` with empty `files[]` passes automatically — no validation needed
- `workflow done` is called normally after intake completes
- Rule 2 (special dialog bootstrap) is eliminated from `workflow-execution.md`
- Rule 5a/5b apply uniformly to intake and all other stages

## Capabilities

### New Capabilities
- `intake-task-format`: Convention for `intake.md` task files with `files: []`, `reads:`, and stage instructions

### Modified Capabilities
- `workflow-execution`: Rule 2 eliminated; Rule 5a/5b now cover intake stage uniformly
- `workflow-format`: Intake stage is no longer special — follows same task file discovery as all other stages

## Impact

- `.agents/skills/designbook-workflow/rules/workflow-execution.md` — Rule 2 removed, Rule 5 updated
- `.agents/skills/*/rules/*.md` — `when.stages` arrays: `dialog` → `intake`
- `.agents/skills/*/tasks/intake.md` — new task files per skill where intake behavior needs enforcement
- `.agents/workflows/debo-*.md` — `stages:` arrays: `dialog` → `intake`
- `designbook.config.yml` — rule keys: `debo-*:dialog` → `debo-*:intake`
