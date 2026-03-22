## Why

Workflows currently provide no record of which skill task files, rule files, config rules/instructions, or validation results were active during execution. This makes debugging failures and understanding what constrained a stage impossible after the fact.

## What Changes

- `workflow done` gains a `--loaded` JSON flag carrying stage context (task file, rules, config rules, config instructions) and task-level validation results
- `tasks.yml` schema extended: each task gains a `loaded` block (stage-deduplicated) and a `validation` array
- `designbook-workflow` skill updated: AI assembles and passes `--loaded` on every `workflow done` call
- CLI stores `--loaded` data: deduplicates `loaded` at the stage level, stores `validation` per task

## Capabilities

### New Capabilities
- `workflow-loaded-tracking`: Tracks which task file, rule files, config rules, config instructions, and validation results applied per stage/task via a `--loaded` flag on `workflow done`

### Modified Capabilities
- `workflow-tasks`: tasks.yml schema gains `loaded` (stage-level, deduplicated) and `validation` (task-level) fields
- `workflow-cli`: `workflow done` gains `--loaded <json>` flag

## Impact

- CLI: `workflow done` command handler
- tasks.yml schema / YAML serialization
- `designbook-workflow` SKILL.md: Rule 2 updated to pass `--loaded` on done calls
