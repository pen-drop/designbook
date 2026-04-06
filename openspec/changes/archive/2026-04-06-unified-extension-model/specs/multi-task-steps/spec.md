## ADDED Requirements

### Requirement: Multiple tasks can match a single workflow step

The CLI SHALL discover and resolve multiple tasks per step during `workflow create`.

#### Scenario: Single task per step (backward compatible)
- **WHEN** only one task matches step `screenshot`
- **THEN** behavior is identical to today — the task runs as the sole task for that step

#### Scenario: Multiple tasks match one step
- **WHEN** `ensure-storybook.md` (priority 5), `screenshot-storybook.md` (priority 10), and `screenshot-reference.md` (priority 20) all match step `screenshot`
- **THEN** all three are included in the step's task list
- **AND** they are ordered by priority: 5, 10, 20

#### Scenario: Tasks filtered by when conditions before multi-resolution
- **WHEN** `inspect-stitch.md` declares `when: stitch`
- **AND** the current project does not have `stitch` active
- **THEN** `inspect-stitch.md` is excluded from resolution before priority sorting

### Requirement: workflow create stores ordered task list per step

The `tasks.yml` output SHALL contain an ordered array of tasks per step instead of a single task reference.

#### Scenario: tasks.yml format with multiple tasks
- **WHEN** step `inspect` resolves to three tasks
- **THEN** `tasks.yml` contains:
  ```yaml
  steps:
    inspect:
      tasks:
        - name: designbook:design:inspect-storybook
          file: .agents/skills/designbook/design/tasks/inspect-storybook.md
          priority: 10
        - name: designbook:design:inspect-reference
          file: .agents/skills/designbook/design/tasks/inspect-reference.md
          priority: 20
        - name: designbook-stitch:inspect-stitch
          file: .agents/skills/designbook-stitch/tasks/inspect-stitch.md
          priority: 30
  ```

#### Scenario: tasks.yml with single task (backward compatible)
- **WHEN** step `polish` resolves to one task
- **THEN** `tasks.yml` contains the same array format with a single entry

### Requirement: Tasks within a step execute sequentially by priority

When a step has multiple tasks, they SHALL execute sequentially in priority order (lowest first).

#### Scenario: Sequential execution
- **WHEN** step `screenshot` has tasks at priority 5, 10, 20
- **THEN** priority 5 runs first, then 10, then 20
- **AND** each task completes before the next starts

#### Scenario: Task failure stops step execution
- **WHEN** the task at priority 10 fails
- **THEN** tasks at priority 20 and higher do NOT run
- **AND** the step is marked as failed

### Requirement: Tasks in the same step share data context

Tasks within a step SHALL have access to outputs from prior tasks in the same step.

#### Scenario: Later task reads earlier task output
- **WHEN** `inspect-storybook` (priority 10) writes `inspect-storybook.json` to the step's output directory
- **AND** `inspect-reference` (priority 20) runs next
- **THEN** `inspect-reference` can read `inspect-storybook.json`

#### Scenario: Step output directory convention
- **WHEN** a step executes with multiple tasks
- **THEN** all tasks write to the same step output directory (e.g., `designbook/workflows/<workflow>/steps/<step>/`)

## MODIFIED Requirements

### Requirement: workflow create task discovery (DELTA)

**Previously**: `workflow create` matched one task file per step by filename matching step name.

**Now**: `workflow create` globs all `tasks/*.md` files across all active skills, filters by `when`, applies `name`/`as` deduplication, sorts by `priority`, and stores an ordered task list per step.

#### Scenario: Discovery across multiple skills
- **WHEN** `workflow create` runs for a workflow with step `inspect`
- **AND** `.agents/skills/designbook/design/tasks/inspect-storybook.md` has `step: inspect`
- **AND** `.agents/skills/designbook-stitch/tasks/inspect-stitch.md` has `step: inspect, when: stitch`
- **THEN** both are discovered and included (if `when` conditions match)
