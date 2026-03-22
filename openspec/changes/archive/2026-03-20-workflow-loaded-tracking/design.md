## Context

Workflow task files (`tasks.yml`) track execution progress but record no context about what influenced each stage. When a workflow fails or produces unexpected output, there is no way to know which task file, rule files, config rules, or config instructions were active — and no record of which validators ran against which files.

The `workflow done` command is already called at the end of every task. The AI has full knowledge at that point of what was loaded for the stage.

## Goals / Non-Goals

**Goals:**
- Record which task file, skill rule files, config rules, and config instructions applied per stage
- Record which validators ran per task and their pass/fail outcome
- Keep the write surface minimal: one new flag on an existing command
- Deduplicate stage-level data (task file, rules) — stored once per stage, not per task

**Non-Goals:**
- Token tracking (out of scope, no reliable source)
- A `workflow stats` read command (data is in tasks.yml, readable directly)
- Tracking loaded data for the dialog stage (no task file or task end call)

## Decisions

### Single `--loaded` JSON flag on `workflow done`

**Decision**: Extend `workflow done` with one optional `--loaded '<json>'` flag containing all context.

**Alternatives considered**:
- Separate `workflow stage-loaded` command → extra call, harder to enforce, AI may forget
- Extend `workflow validate` to auto-write validators → CLI can't know validator names reliably without AI interpretation
- Multiple flags (`--task-file`, `--rules`, `--validation`) → messier CLI surface, same data

**Rationale**: Bundling into `workflow done` means one atomic write. The AI already calls `done` after every task — extending it adds zero extra steps.

### Stage-level deduplication for `loaded`

**Decision**: `loaded` (task_file, rules, config_rules, config_instructions) is stored at the stage level in `tasks.yml`, not per task. The CLI deduplicates: first `done` with `--loaded` for a given stage writes it; subsequent done calls for the same stage ignore `--loaded`.

**Rationale**: Multiple tasks in the same stage share identical loaded context. Repeating it per task wastes space and creates false diff noise.

### `validation` is task-level

**Decision**: `validation` array inside `--loaded` is stored per task (not deduplicated).

**Rationale**: Each task validates different files, so validation results are inherently task-specific.

### AI assembles `--loaded`, not CLI

**Decision**: The AI builds the `--loaded` JSON from what it read (task file path, rule file paths, config strings) and what `workflow validate` returned (validator names, pass/fail). The CLI stores it as-is.

**Rationale**: The CLI cannot reliably infer which rule files the AI loaded or how to interpret validate output. The AI is the source of truth for what influenced execution.

### Absolute paths

**Decision**: All file paths in `--loaded` (task_file, rules) are absolute.

**Rationale**: Consistent with existing convention in task file definitions. No ambiguity about working directory.

## Risks / Trade-offs

- **AI may omit `--loaded`**: If the AI skips the flag, no tracking data is stored. Mitigation: skill rule makes it mandatory.
- **JSON escaping in shell**: `--loaded '<json>'` requires careful quoting. Mitigation: spec and skill show the exact pattern; CLI validates JSON before storing.
- **Stale data if workflow is resumed mid-stage**: If a workflow resumes after a crash, the first done call for each stage re-writes loaded. This is acceptable — the data reflects the resumed execution context.

## Migration Plan

- No migration needed: existing tasks.yml files without `loaded`/`validation` fields remain valid
- CLI treats both fields as optional on read; only writes when `--loaded` is passed
- Existing `workflow done` calls without `--loaded` continue to work unchanged
