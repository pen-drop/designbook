# workflow-execution Delta Specification

## Purpose

Extends the workflow execution spec to remove per-task CLI commands from task files, introduce a generic done protocol, and support `workflow done --data` for data results.

---

## MODIFIED Requirements

### Requirement: workflow done

Accepts `--workflow <name>`, `--task <id>`, optional `--params <json>`, `--loaded <json>`, `--data <json>`. Marks task done, computes next action via lifecycle, emits `RESPONSE:` JSON.

- Task set to `done` with `completed_at`, all task file timestamps updated
- Gate-check: rejects if declared file results are unwritten, have `validation_result.valid === false`, or if required data results are missing
- `--params` with intake → plan mode; with non-intake → append mode
- `--loaded` stored in `stage_loaded[step]` (first write wins)
- `--data <json>` distributes data to declared result keys (see implicit-result-collection spec)
- Results with `default:` in the merged schema SHALL be auto-filled if not explicitly provided

#### Scenario: Task marked done with data results
- **WHEN** `workflow done --task X --data '{"scene": "shell", "reference": []}'` is called
- **AND** the task declares `result: { scene: { type: string }, reference: { type: array } }`
- **THEN** both results are validated against the merged schema
- **AND** the task is marked as done with `completed_at`
- **AND** `RESPONSE:` JSON is emitted for next action

#### Scenario: Default values auto-fill missing results
- **WHEN** `workflow done --task X` is called
- **AND** the task declares `result: { breakpoints: { type: array, default: [] } }`
- **AND** `breakpoints` is not provided via `--data` or prior `workflow result`
- **THEN** the engine fills `breakpoints` with `[]` from the merged schema default
- **AND** the task is marked as done

#### Scenario: Gate-check rejects missing required result
- **WHEN** `workflow done --task X` is called without `--data`
- **AND** the task declares a required data result without a default
- **AND** the result was not written via prior `workflow result`
- **THEN** the engine returns an error listing the missing result keys
- **AND** the task remains in-progress

---

### Requirement: Task-level execution cycle

Load instructions → read merged schema → do work → write file results to declared paths → call `workflow done` (with optional `--data` for data results) → fix validation errors → follow `RESPONSE:`.

Task files SHALL NOT contain CLI commands for result writing (`workflow result --key`, `workflow done --task $TASK_ID`). Task files contain only domain context: what to produce, how to ask, what to consider. The execution protocol is defined generically below.

#### Scenario: AI follows generic done protocol for file results
- **WHEN** a task declares result keys with `path:` fields
- **AND** the AI has produced all required file content
- **THEN** the AI writes each file to its declared path using the Write tool
- **AND** calls `workflow done --task <id>`
- **AND** the engine auto-detects files at declared paths

#### Scenario: AI follows generic done protocol for data results
- **WHEN** a task declares result keys without `path:` fields
- **AND** the AI has gathered all required data
- **THEN** the AI passes all data results as a single JSON object via `workflow done --task <id> --data '<json>'`

#### Scenario: AI follows generic done protocol for external file results
- **WHEN** a file result is written by an external tool (e.g., Playwright)
- **THEN** the AI calls `workflow result --task <id> --key <key> --external` to register the file
- **AND** then calls `workflow done --task <id>`

#### Scenario: AI follows generic done protocol for tasks without results
- **WHEN** a task declares no result keys
- **THEN** the AI calls `workflow done --task <id>` after completing the work

---

### Requirement: Response-driven execution

`workflow done` returns `RESPONSE:` JSON that drives all execution. AI MUST follow the response.

| Condition | Response |
|-----------|----------|
| More pending tasks in stage | `{ "stage": "<current>", "next_step": "<step>" }` |
| Stage transition | `{ "stage": "<next>", "transition_from": "<prev>", "next_stage": "<next>", "next_step": "<step>" }` |
| Unfulfilled stage params | `{ "waiting_for": { "<key>": { "type": "<type>", "prompt": "<text>" } } }` |
| Validation error from --data | `{ "validation_errors": { "<key>": ["<error>"] } }` |
| Subworkflow dispatch | `{ "stage": "done", "dispatch": [{ "workflow": "<id>", "workflow_file": "<path>", "params": {...} }] }` |
| All stages exhausted | `{ "stage": "done" }`, workflow archived |

#### Scenario: Validation error returned in response
- **WHEN** `workflow done --data '{"scene": 123}'` is called
- **AND** the merged schema declares `scene: { type: string }`
- **THEN** the response includes `validation_errors` for the `scene` key
- **AND** the task remains in-progress
- **AND** the AI fixes the data and retries

#### Scenario: Stage transition after data results accepted
- **WHEN** `workflow done --data '{"scene": "shell"}'` is called
- **AND** validation passes
- **AND** the current stage has no more pending tasks
- **THEN** the response includes `transition_from` and `next_stage` fields

---

### Requirement: workflow instructions

`workflow instructions --workflow <name> --stage <name>` returns resolved task_file, rules, blueprints, config_rules, config_instructions, expected_params from `stage_loaded`, and the `merged_schema` for the task.

The `merged_schema` field SHALL contain the fully composed result schema — base task schema merged with all `extends:`, `provides:`, and `constrains:` from matched blueprints and rules. The AI uses this as the single source of truth for what to fill.

Subworkflow stages include `dispatch: true`, `workflow`, `workflow_file`, `items`.

#### Scenario: Instructions include merged schema
- **WHEN** `workflow instructions --stage create-tokens` is called
- **AND** the task has a base result schema extended by a Tailwind blueprint
- **THEN** the response includes `merged_schema` with the fully composed schema
- **AND** the AI sees all required properties, defaults, and constraints from all sources

#### Scenario: Instructions without schema extensions
- **WHEN** `workflow instructions --stage create-vision` is called
- **AND** no rules or blueprints extend the result schema
- **THEN** the `merged_schema` field contains the base task schema unchanged

---

## ADDED Requirements

### Requirement: Generic done protocol in execution rules

The workflow execution rules (`workflow-execution.md`) SHALL define a generic protocol for completing any task. This protocol replaces all per-task CLI instructions that previously appeared in task file bodies.

The protocol:

1. **File results** (result keys with `path:`): Write each file to its declared path using the Write tool or stdin. The engine auto-detects files at declared paths when `done` is called.

2. **Data results** (result keys without `path:`): Pass all data results as a single JSON object: `_debo workflow done --task <id> --data '<json>'`

3. **No results**: `_debo workflow done --task <id>`

4. **External file results** (written by Playwright or other external tools): Register via `_debo workflow result --task <id> --key <key> --external`, then call `_debo workflow done --task <id>`

5. **Mixed results**: File results are auto-collected, data results passed via `--data`. External results registered first. Then `_debo workflow done --task <id> --data '<json>'`

Task files SHALL contain only domain context — what to produce, how to ask, format constraints, and gathering instructions. The execution mechanics (how to call CLI, how to pass results) are defined by this generic protocol.

#### Scenario: Task file contains no CLI commands
- **WHEN** a task file is loaded for execution
- **THEN** the task body contains domain-specific instructions (what to ask, what to consider, format constraints)
- **AND** the task body does NOT contain `workflow result`, `workflow done`, or `$TASK_ID` references
- **AND** the AI applies the generic done protocol from execution rules

#### Scenario: AI completes mixed file and data results
- **WHEN** a task declares `result: { vision: { path: "...md", type: object }, notes: { type: string } }`
- **AND** the AI writes the vision file to its declared path
- **AND** the AI has gathered the notes data
- **THEN** the AI calls `workflow done --task <id> --data '{"notes": "..."}'`
- **AND** the engine auto-collects the vision file and validates the notes data
