## ADDED Requirements

### Requirement: Multiple tasks per step

The workflow resolver SHALL return ALL matching task files for a step instead of picking the single highest-specificity match. All matching tasks run in parallel within the same step.

#### Scenario: Two skills provide tasks for the same step
- **WHEN** `css-generate/tasks/generate-jsonata.md` matches (universal, no `when`)
- **AND** `fonts-google/tasks/generate-jsonata.md` matches (`when: frameworks.fonts: google-fonts`)
- **THEN** both tasks are included in the resolved plan for the `generate-jsonata` step
- **AND** both tasks run in parallel

#### Scenario: Single matching task
- **WHEN** only one task file matches a step
- **THEN** behavior is identical to before — one task runs

#### Scenario: Named stage resolution remains single-task
- **WHEN** an item uses named stage format `skill:task`
- **THEN** it resolves directly to that specific task file (no multi-match)

### Requirement: Workflow resolver skips steps with no matching task file

When no task file matches a step, the resolver SHALL skip that step instead of throwing an error.

#### Scenario: Step with no matching task file is skipped
- **WHEN** a workflow declares step `generate-jsonata`
- **AND** no skill provides a matching `tasks/generate-jsonata.md`
- **THEN** the step is silently skipped
- **AND** the workflow continues with the next step

#### Scenario: Debug log emitted on skip
- **WHEN** a step is skipped due to no matching task file
- **THEN** a debug-level message is logged indicating the step name was skipped

### Requirement: depends_on removed from resolved tasks

Resolved tasks SHALL NOT contain `depends_on` arrays. Execution order is determined solely by stage ordering: all tasks in step N complete before any task in step N+1 begins.

#### Scenario: Tasks ordered by stage
- **WHEN** workflow declares steps `[generate-jsonata, generate-css]`
- **AND** `generate-jsonata` resolves to two tasks and `generate-css` resolves to one task
- **THEN** the two `generate-jsonata` tasks run in parallel
- **AND** the `generate-css` task runs after both complete
- **AND** no task has a `depends_on` field
