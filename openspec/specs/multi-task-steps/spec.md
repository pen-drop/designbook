## ADDED Requirements

### Requirement: Multiple tasks per workflow step
The CLI SHALL discover and resolve multiple tasks per step during `workflow create`.

- Single task per step: backward compatible, runs as sole task
- Multiple tasks: all matching tasks included, ordered by `priority` (ascending)
- Tasks filtered by `when` conditions before multi-resolution

### Requirement: tasks.yml stores ordered task list per step
`tasks.yml` SHALL contain an ordered array of tasks per step:

```yaml
steps:
  inspect:
    tasks:
      - name: designbook:design:inspect-storybook
        file: .agents/skills/designbook/design/tasks/inspect-storybook.md
        priority: 10
      - name: designbook-stitch:inspect-stitch
        file: .agents/skills/designbook-stitch/tasks/inspect-stitch.md
        priority: 30
```

Single-task steps use the same array format with one entry.

### Requirement: Sequential execution by priority
Tasks within a step execute sequentially in priority order (lowest first). Each task completes before the next starts.

- If a task fails, remaining tasks in the step do NOT run; step is marked failed

### Requirement: Shared data context within a step
Tasks in the same step access outputs from prior tasks. All tasks write to the same step output directory (`designbook/workflows/<workflow>/steps/<step>/`).

## MODIFIED Requirements

### Requirement: workflow create task discovery (DELTA)
**Previously**: One task per step matched by filename.
**Now**: Globs all `tasks/*.md` across active skills, filters by `when`, deduplicates via `name`/`as`, sorts by `priority`, stores ordered list per step.

- Discovery spans multiple skills (e.g. `designbook` + `designbook-stitch` both contribute to `inspect`)
