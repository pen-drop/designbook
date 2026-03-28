# workflow-execution Delta Spec (workflow-state-machine change)

---

## MODIFIED Requirements

### Requirement: Workflow status field

The `status` field values remain unchanged (`planning`, `running`, `completed`). The new `current_stage` field tracks lifecycle position independently of status.

#### Scenario: current_stage and status are independent
- **WHEN** a workflow is in `current_stage: test`
- **THEN** `status` is `running` — status reflects broad workflow state, current_stage reflects lifecycle position

---

### Requirement: workflow done output format

`workflow done` output changes from FLAGS JSON to stage-based response.

#### Scenario: FLAGS line removed
- **WHEN** `workflow done` completes a task
- **THEN** no `FLAGS:` JSON line is emitted
- **AND** a stage-based JSON response is returned instead with fields: `stage`, `step_completed`, `next_step`, `next_stage`, `transition_from`, `waiting_for`

#### Scenario: Agent reads stage instead of flags
- **WHEN** the agent receives a `workflow done` response
- **THEN** it reads `stage` to know where the workflow is, `next_step` to know what to do next, and `waiting_for` to know what input is needed

---

### Requirement: WorkflowTask data model gains stage field

Each task in tasks.yml gains a `stage` field (parent stage: execute, test, preview) alongside the renamed `step` field (was: `stage`).

#### Scenario: Task has both step and stage
- **WHEN** a task is created via `workflow plan`
- **THEN** it has `step: "create-component"` (work unit) and `stage: "execute"` (parent grouping)

#### Scenario: Backwards compatibility — old stage field
- **WHEN** reading a tasks.yml from before this change
- **THEN** the `stage` field (old meaning: step name) is treated as `step` for migration purposes

---

## RENAMED Requirements

### Requirement: Step files encapsulate CLI commands

- **FROM:** "Step files encapsulate CLI commands"
- **TO:** No rename needed — "step" in this context already means CLI step files (`steps/create.md` etc.), not workflow stages. The naming is coincidentally correct.

---

### Requirement: tasks.yml stores stages array and flat stage field per task

- **FROM:** `stages: string[]` (flat array of step names) + `stage: string` per task (step name)
- **TO:** `stages: Record<string, { steps: string[], params?: ... }>` (grouped object) + `step: string` per task (step name) + `stage: string` per task (parent stage name)
