# implicit-result-collection Specification

## Purpose

Reduces the number of CLI calls the AI must make to complete a task. File results at declared paths are auto-detected by `workflow done`. Data results are passed as a single JSON blob via `--data`. The AI calls `workflow done` once — the engine handles validation, serialization, and collection.

---

## ADDED Requirements

### Requirement: workflow done accepts --data for all data results

`workflow done` SHALL accept an optional `--data <json>` flag. The JSON object's keys correspond to result keys declared in the task's `result:` frontmatter. The engine distributes the data to the declared results, validates each against the merged schema, and marks the task as done.

```bash
_debo workflow done --task $TASK_ID --data '{
  "scene": "design-system:shell",
  "reference": [],
  "breakpoints": ["sm", "md", "lg"]
}'
```

The engine SHALL:
1. Parse the `--data` JSON object
2. For each key, match against the task's declared `result:` entries
3. For results with `path:` — serialize data to file (by extension), then validate
4. For results without `path:` — store as data result in tasks.yml, then validate
5. If all results are valid — mark task as done, proceed with stage transition
6. If any result is invalid — return errors, task remains in-progress
7. Unknown keys in `--data` that do not match any declared result SHALL cause an error

#### Scenario: Data results passed via --data
- **WHEN** a task declares `result: { scene: { type: string }, reference: { type: array } }`
- **AND** `workflow done --task X --data '{"scene": "shell", "reference": []}'` is called
- **THEN** both results are stored as data results in tasks.yml
- **AND** the task is marked as done

#### Scenario: Mixed file and data results via --data
- **WHEN** a task declares `result: { vision: { path: "...vision.md", type: object }, notes: { type: string } }`
- **AND** `workflow done --data '{"vision": {...}, "notes": "..."}'` is called
- **THEN** the engine serializes `vision` to the .md path and stores `notes` as a data result

#### Scenario: --data with unknown key causes error
- **WHEN** `workflow done --data '{"unknown_key": "value"}'` is called
- **AND** the task's `result:` does not contain `unknown_key`
- **THEN** the engine returns an error listing the valid result keys

#### Scenario: --data validation failure
- **WHEN** `workflow done --data '{"scene": 123}'` is called
- **AND** the schema declares `scene: { type: string }`
- **THEN** the engine returns a validation error
- **AND** the task remains in-progress

---

### Requirement: workflow done auto-collects file results at declared paths

When `workflow done` is called (with or without `--data`), the engine SHALL check each file result (result with `path:`) to see if a file already exists at the resolved path. If the file exists and has not been explicitly written via `workflow result --key`, the engine SHALL auto-register it as a file result and validate its content.

```
For each result key with path:
  resolved_path = expandFilePath(path, params, env)
  if file exists at resolved_path AND result not yet registered:
    read file content
    validate against schema (if declared)
    register as file result
```

This allows the AI to write files using any method (Write tool, cat, Playwright) without calling `workflow result --key` for each one. The engine auto-detects them at `done` time.

#### Scenario: File written via Write tool auto-collected
- **WHEN** a task declares `result: { vision: { path: "$DESIGNBOOK_DATA/vision.md" } }`
- **AND** the AI writes the file to that path using the Write tool
- **AND** `workflow done --task X` is called (without `--data` for vision)
- **THEN** the engine detects the file at the resolved path
- **AND** validates it against the schema
- **AND** registers it as a completed file result

#### Scenario: File not present at declared path
- **WHEN** a task declares `result: { vision: { path: "..." } }`
- **AND** no file exists at the resolved path
- **AND** no `--data` provides the vision key
- **THEN** the engine reports the missing result and the task remains in-progress

#### Scenario: Explicit workflow result takes precedence over auto-collection
- **WHEN** a file result was already written via `workflow result --key vision`
- **AND** `workflow done` is called
- **THEN** the engine uses the already-registered result and does NOT re-read the file

#### Scenario: Auto-collected file validated against schema
- **WHEN** a `.yml` file is auto-collected and the result declares a JSON Schema
- **THEN** the engine parses the YAML and validates it against the schema
- **AND** if validation fails, the error is returned and the task remains in-progress

---

### Requirement: workflow done without --data only succeeds if all results are satisfied

When `workflow done` is called without `--data`, the engine SHALL check that all declared results are satisfied — either by prior `workflow result` calls, by auto-collected files, or by results that have `default:` values in the schema.

Results with `default:` in the merged schema SHALL be auto-filled with their default value if not explicitly provided.

#### Scenario: All file results auto-collected, no data results
- **WHEN** a task declares only file results (all with `path:`)
- **AND** all files exist at their declared paths
- **AND** `workflow done` is called without `--data`
- **THEN** all files are auto-collected, validated, and the task is marked done

#### Scenario: Data results missing without --data
- **WHEN** a task declares data results (without `path:`) that have no `default:`
- **AND** `workflow done` is called without `--data`
- **AND** the data results were not written via prior `workflow result` calls
- **THEN** the engine returns an error listing the missing data result keys

#### Scenario: Default values auto-fill missing results
- **WHEN** a task declares `result: { breakpoints: { type: array, default: [] } }`
- **AND** `workflow done` is called without providing `breakpoints`
- **THEN** the engine fills `breakpoints` with `[]` from the default
- **AND** the task is marked as done

---

### Requirement: workflow result --key remains for external and mid-task writes

The existing `workflow result --key <key>` command SHALL continue to work for cases where:
- An external tool (e.g. Playwright) writes a file to a staged path and needs `--external` registration
- A file must be written and flushed mid-task via `--flush` for subsequent steps to read
- Content is provided via stdin (pipe) rather than structured data

`workflow result` is the escape hatch. For the common case, `workflow done --data` and auto-collection replace it.

#### Scenario: External tool writes file, registered via workflow result
- **WHEN** Playwright captures a screenshot to the staged path
- **AND** `workflow result --task X --key screenshot --external` is called
- **THEN** the file is registered and validated
- **AND** `workflow done` later succeeds without needing to auto-collect it

#### Scenario: Mid-task flush for subsequent reads
- **WHEN** a task needs to write a file that a later step in the same task reads
- **AND** `workflow result --task X --key reference --flush` is called
- **THEN** the file is immediately moved to its final path
- **AND** subsequent reads within the task can access it
