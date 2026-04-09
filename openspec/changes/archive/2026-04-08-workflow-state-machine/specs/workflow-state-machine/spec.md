# workflow-state-machine Specification

## Purpose
Defines the stage-based workflow lifecycle: stage grouping, state machine transitions, engine transition handlers, and params-based blocking.

---

## ADDED Requirements

### Requirement: Workflow lifecycle is a fixed stage sequence

The workflow lifecycle SHALL follow a fixed sequence of stages:

```
created → planned → execute → committed → test → preview → finalizing → done
```

`execute`, `test`, and `preview` are **declared stages** — defined in workflow frontmatter with steps.
`created`, `planned`, `committed`, `finalizing`, and `done` are **implicit stages** — always present, managed by the engine/system.

#### Scenario: All declared stages present
- **WHEN** a workflow declares `execute`, `test`, and `preview` stages with steps
- **THEN** the lifecycle traverses all stages in order

#### Scenario: Declared stage has no steps — auto-skip
- **WHEN** a workflow declares only `execute` (no `test` or `preview`)
- **THEN** the lifecycle skips from `committed` directly to `finalizing`

#### Scenario: Stage order is fixed
- **WHEN** a workflow frontmatter declares stages in any order
- **THEN** the lifecycle always follows: execute → committed → test → preview → finalizing
- **AND** the declared order in YAML is ignored for lifecycle purposes

---

### Requirement: Engine implements onTransition handler

Each engine SHALL implement a single `onTransition(from, to, ctx)` method instead of named lifecycle methods.

#### Scenario: git-worktree handles planned → execute
- **WHEN** the state machine transitions from `planned` to `execute`
- **THEN** the `git-worktree` engine creates a worktree and returns a remapped env map

#### Scenario: git-worktree handles execute → committed
- **WHEN** the state machine transitions from `execute` to `committed`
- **THEN** the `git-worktree` engine runs `git add` + `git commit` in the worktree

#### Scenario: git-worktree handles committed → test
- **WHEN** the state machine transitions from `committed` to `test`
- **THEN** the `git-worktree` engine sets up the test environment (starts Storybook in worktree)

#### Scenario: git-worktree handles finalizing → done
- **WHEN** the state machine transitions from `finalizing` to `done` with `merge_approved: true`
- **THEN** the `git-worktree` engine squash-merges the branch, deletes it, and archives

#### Scenario: direct engine handles finalizing → done
- **WHEN** the state machine transitions from `finalizing` to `done`
- **THEN** the `direct` engine archives immediately (no params required)

#### Scenario: Engine ignores unknown transitions
- **WHEN** a transition occurs that the engine has no handler for
- **THEN** the engine returns a noop result

#### Scenario: Abandon triggers cleanup
- **WHEN** a workflow is abandoned from any stage
- **THEN** `onTransition(current_stage, 'abandoned', ctx)` is called
- **AND** the git-worktree engine removes the worktree and branch

---

### Requirement: Stage params block transitions until fulfilled

A stage MAY declare `params` that must be provided before the stage can proceed.

#### Scenario: Stage with unfulfilled params
- **WHEN** the state machine enters a stage with declared params
- **AND** the params have not been provided
- **THEN** `workflow done` returns `waiting_for` with param definitions including prompts

#### Scenario: Params provided — stage unblocks
- **WHEN** all required params for a stage are provided (via CLI argument)
- **THEN** the state machine proceeds with the stage's steps

#### Scenario: Engine injects params on transition
- **WHEN** the `git-worktree` engine handles `finalizing → done`
- **THEN** it injects `merge_approved` as a required param with prompt
- **AND** the transition blocks until the param is provided

#### Scenario: direct engine injects no params on finalizing
- **WHEN** the `direct` engine handles `finalizing → done`
- **THEN** no params are injected — the transition proceeds immediately

#### Scenario: Param prompt supports variable interpolation
- **WHEN** a param prompt contains `{preview_url}` or `{branch}`
- **THEN** the system interpolates the value from the workflow's current state

---

### Requirement: workflow done returns stage-based response

`workflow done` SHALL return a structured response indicating current stage and next action, replacing the FLAGS JSON line.

#### Scenario: Next step in same stage
- **WHEN** a step is completed and more steps remain in the current stage
- **THEN** the response contains `stage`, `step_completed`, and `next_step`

#### Scenario: Stage transition
- **WHEN** the last step in a stage is completed
- **THEN** the engine's `onTransition` is called
- **AND** the response contains `stage` (new), `transition_from` (old), `next_stage`, and optionally `next_step`

#### Scenario: Waiting for params
- **WHEN** a stage transition leads to a stage with unfulfilled params
- **THEN** the response contains `stage` and `waiting_for` with param definitions

#### Scenario: Workflow complete
- **WHEN** the `finalizing → done` transition completes
- **THEN** the response contains `stage: "done"` and the workflow is archived

#### Scenario: FLAGS JSON line is removed
- **WHEN** `workflow done` completes
- **THEN** no `FLAGS:` line is emitted in the output

---

### Requirement: WorkflowTaskFile tracks current_stage

`WorkflowTaskFile` SHALL have a `current_stage` field that tracks the active lifecycle stage.

#### Scenario: Initial stage after plan
- **WHEN** `workflow plan` completes
- **THEN** `current_stage` is set to `planned`

#### Scenario: Stage updated on transition
- **WHEN** the state machine transitions to a new stage
- **THEN** `current_stage` is atomically updated in tasks.yml

#### Scenario: current_stage readable by any command
- **WHEN** any CLI command reads tasks.yml
- **THEN** it can determine the workflow's current lifecycle position from `current_stage`
