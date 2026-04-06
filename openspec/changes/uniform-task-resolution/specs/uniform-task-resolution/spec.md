## ADDED Requirements

### Requirement: Task files declare when.steps for resolution

Every task file SHALL declare `when: steps: [<step-name>]` in its frontmatter to specify which workflow step(s) it applies to.

#### Scenario: Task with single step
- **WHEN** `screenshot.md` declares `when: steps: [screenshot]`
- **THEN** it is resolved for the `screenshot` step
- **AND** it is NOT resolved for any other step

#### Scenario: Task with multiple steps
- **WHEN** a task declares `when: steps: [screenshot, inspect]`
- **THEN** it is resolved for both the `screenshot` and `inspect` steps

#### Scenario: Task without when.steps is skipped
- **WHEN** a task file has no `when.steps` declaration
- **THEN** it is NOT resolved for any step
- **AND** the CLI emits a warning: "Task file {path} has no when.steps — skipped"

### Requirement: Workflow-qualified tasks use workflow:step format in when.steps

Task files with `--workflow` filename suffix SHALL use the `workflow:step` format in `when.steps` instead of the unqualified step name. The corresponding workflow definition SHALL declare the step in the same qualified format.

#### Scenario: Intake task qualified by workflow
- **WHEN** `intake--design-shell.md` exists
- **THEN** it declares `when: steps: [design-shell:intake]`
- **AND** the `design-shell.md` workflow declares `steps: [design-shell:intake]` (not `steps: [intake]`)

#### Scenario: Scene task qualified by workflow
- **WHEN** `create-scene--design-screen.md` exists
- **THEN** it declares `when: steps: [design-screen:create-scene]`
- **AND** the `design-screen.md` workflow declares `steps: [design-screen:create-scene]`

#### Scenario: Qualified step resolves via broad scan
- **WHEN** step `design-shell:intake` is being resolved
- **THEN** the broad scan finds `intake--design-shell.md` via `when: steps: [design-shell:intake]`
- **AND** filename is not used for resolution

### Requirement: Task resolution uses broad-scan matching

The task resolver SHALL scan all task files broadly (`skills/**/tasks/*.md`) and filter by `when` conditions, identical to how rules and blueprints are resolved.

#### Scenario: Broad scan finds task by when.steps
- **WHEN** step `inspect` is being resolved
- **AND** `inspect-storybook.md` declares `when: steps: [inspect]`
- **THEN** the resolver finds `inspect-storybook.md` regardless of its filename

#### Scenario: Multiple tasks from different skills match one step
- **WHEN** step `inspect` is being resolved
- **AND** `designbook/design/tasks/inspect-storybook.md` has `when: steps: [inspect]`
- **AND** `designbook-stitch/tasks/inspect-stitch.md` has `when: steps: [inspect], extensions: stitch`
- **AND** `stitch` extension is active
- **THEN** both tasks are resolved for the step
- **AND** they are sorted by priority

#### Scenario: Config conditions filter tasks
- **WHEN** step `inspect` is being resolved
- **AND** `inspect-stitch.md` has `when: steps: [inspect], extensions: stitch`
- **AND** `stitch` extension is NOT active
- **THEN** `inspect-stitch.md` is excluded from resolution

### Requirement: Uniform resolution model across all artifact types

Tasks, rules, and blueprints SHALL use the same resolution mechanism: broad glob scan → parse frontmatter → filter by `when` conditions (including `steps`) → sort/deduplicate.

#### Scenario: Task resolution matches rule resolution pattern
- **WHEN** `resolveTaskFiles()` resolves step `screenshot`
- **THEN** it uses `buildRuntimeContext(stage)` to include the step name in context
- **AND** it scans `skills/**/tasks/*.md` (not `skills/**/tasks/${stage}.md`)
- **AND** it filters by `checkWhen()` against context and config

#### Scenario: Existing name/as deduplication still applies
- **WHEN** multiple tasks match a step
- **THEN** `deduplicateByNameAs()` runs on the matches
- **AND** tasks with `as` override the named target
- **AND** tasks without `as` are additive

## MODIFIED Requirements

### Requirement: workflow create task discovery (DELTA)

**Previously**: `workflow create` matched task files by filename convention (`skills/**/tasks/${step}.md`), with a secondary broad scan for tasks with explicit `when.steps`.

**Now**: `workflow create` uses broad scan as the primary mechanism. All task files MUST declare `when.steps`. Filename is irrelevant for resolution.

#### Scenario: Discovery uses broad scan only
- **WHEN** `workflow create` resolves step `create-component`
- **THEN** it scans ALL `skills/**/tasks/*.md` files
- **AND** filters to those with `when: steps` including `create-component`
- **AND** does NOT rely on the filename being `create-component.md`

#### Scenario: Workflow-qualified tasks resolved by when.steps
- **WHEN** step `intake` is being resolved for workflow `design-shell`
- **AND** `intake--design-shell.md` has `when: steps: [intake]`
- **THEN** it is found by broad scan + when matching
- **AND** the `--design-shell` filename suffix is not used for resolution
