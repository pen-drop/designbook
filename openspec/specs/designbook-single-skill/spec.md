## ADDED Requirements

### Requirement: Single skill named `debo`, directory `designbook`
The system SHALL have one skill registered as `debo` (in SKILL.md `name:` field) living in `.agents/skills/designbook/`. The skill name `debo` is the user-facing shorthand; the directory name `designbook` reflects the full product name.

#### Scenario: Skill description triggers on design intent
- **WHEN** user says "ich möchte ein Design für die Homepage anlegen" or "I want to create a screen for the dashboard"
- **THEN** Claude triggers `/debo` based on the SKILL.md description — without the user explicitly typing the command

#### Scenario: SKILL.md description is broad, workflow descriptions are specific
- **WHEN** the SKILL.md description is read at conversation start
- **THEN** it is brief and covers the general design system domain — not individual workflow names
- **AND** each `workflows/*.md` file contains a `description` field with specific trigger phrases read at dispatch time

#### Scenario: Two-step intent resolution
- **WHEN** user says "ich möchte einen Screen für die Homepage anlegen"
- **THEN** step 1: SKILL.md description triggers `/debo` (broad match: "create or design anything")
- **AND** step 2: skill scans `**/workflows/*.md` descriptions and dispatches to `design-screen` (specific match)

#### Scenario: Skill name matches command
- **WHEN** the skill SKILL.md declares `name: debo`
- **THEN** the user-facing command is `/debo` and all sub-workflow invocations use `/debo <workflow-id>`

#### Scenario: Directory name differs from skill name
- **WHEN** the skill dir is `.agents/skills/designbook/`
- **THEN** the slash command is still `/debo` — dir name and skill name are independent

#### Scenario: User invokes workflow by argument
- **WHEN** user runs `/debo vision`
- **THEN** the skill dispatches to the `vision` workflow by scanning `**/workflows/vision.md`

#### Scenario: User invokes workflow by intent
- **WHEN** user says "I want to build a screen for the homepage"
- **THEN** Claude matches intent to `design-screen` via its `description` field and invokes `/debo design-screen`

#### Scenario: No argument — runtime discovery
- **WHEN** `/debo` is invoked without argument
- **THEN** the skill scans all `**/workflows/*.md`, reads each `description`, presents available workflows, and asks the user to choose

### Requirement: Three-level directory structure
The skill SHALL use a strict three-level structure: skill root → concern dir → standard containers (`tasks/`, `rules/`, `resources/`, `workflows/`). No further nesting beyond level three.

#### Scenario: Concern dir at skill root
- **WHEN** a concern dir `vision/` exists at `designbook/vision/`
- **THEN** it contains only standard container dirs and no files directly

#### Scenario: No nesting beyond three levels
- **WHEN** any directory scan runs
- **THEN** no named dirs exist inside `tasks/`, `rules/`, or `resources/` — only files

#### Scenario: workflows/ contains only flat .md files
- **WHEN** `design/workflows/` is scanned
- **THEN** it contains only `.md` files (`design-screen.md`, `design-component.md`, etc.) — no subdirectories

### Requirement: Workflow definition files named after workflow identifier
Each workflow SHALL be defined in `<concern>/workflows/<workflow-id>.md` where `<workflow-id>` matches the argument used in `/designbook <workflow-id>`.

#### Scenario: Workflow file name matches command argument
- **WHEN** user runs `/designbook design-screen`
- **THEN** the skill loads `design/workflows/design-screen.md`

#### Scenario: Grouped workflows share a concern dir
- **WHEN** `design/workflows/` contains `design-component.md`, `design-screen.md`, `design-shell.md`, `design-guidelines.md`, `design-test.md`
- **THEN** all are dispatched via `/designbook design-*` and share `design/tasks/`, `design/rules/`, `design/resources/`

### Requirement: Workflow-specific files use `--` qualifier
Files in a shared `tasks/` or `rules/` dir that belong to a single workflow SHALL use `<task-type>--<workflow-id>.md` naming. Files without `--` are shared across all workflows in the concern.

#### Scenario: Workflow-specific task file
- **WHEN** `design/tasks/intake--design-screen.md` exists
- **THEN** it applies only to the `design-screen` workflow, discovered via stage reference `design-screen:intake`

#### Scenario: Shared task file
- **WHEN** `design/tasks/create-component.md` exists (no `--`)
- **THEN** it is a candidate for any workflow in the `design/` concern that has a `create-component` stage

#### Scenario: Same task type, different workflows
- **WHEN** `design/tasks/create-scene--design-screen.md` and `design/tasks/create-scene--design-shell.md` both exist
- **THEN** `design-screen:create-scene` resolves to the first, `design-shell:create-scene` to the second

#### Scenario: Rules also use -- qualifier
- **WHEN** `design/rules/some-rule--design-screen.md` exists
- **THEN** it is loaded only when executing the `design-screen` workflow

### Requirement: Stage reference with `:` resolves via glob
When a stage in a workflow definition uses `<workflow-id>:<task>` syntax, the system SHALL resolve it via glob `**/<task>--<workflow-id>.md` within the skill.

#### Scenario: Colon stage reference resolves to qualified file
- **WHEN** `design-screen.md` declares stage `design-screen:intake`
- **THEN** glob `**/intake--design-screen.md` finds `design/tasks/intake--design-screen.md`

#### Scenario: Plain stage reference resolves to shared file
- **WHEN** `design-screen.md` declares stage `create-component` (no colon)
- **THEN** glob `**/create-component.md` finds `design/tasks/create-component.md`

### Requirement: Execution engine resources at skill root
The workflow execution engine resources SHALL live in `designbook/resources/` at the skill root — not in a separate skill or `common/` directory.

#### Scenario: Execution resources always loaded
- **WHEN** any designbook workflow is executed
- **THEN** `designbook/resources/workflow-execution.md`, `cli-reference.md`, `task-format.md`, and `architecture.md` are available as skill context

### Requirement: Cross-concern task reuse via glob — no before: required
A workflow MAY use task files from another concern's `tasks/` dir without declaring a `before:` dependency. The task is referenced as a plain stage name and discovered via glob. Stage ordering within `stages:` controls execution order.

#### Scenario: Cross-concern task used as plain stage
- **WHEN** `design-screen` declares stage `create-sample-data` (no colon)
- **THEN** glob finds `sample-data/tasks/create-sample-data.md` — no `before: sample-data` needed

#### Scenario: Stage ordering replaces before: for mid-workflow tasks
- **WHEN** `create-sample-data` must run after `create-component` in `design-screen`
- **THEN** the `stages:` array declares the correct order: `[..., create-component, create-sample-data, ...]`
- **AND** no `before:` on the `sample-data` workflow is used (that would run the full workflow as a prerequisite)

### Requirement: rules loaded before tasks
For every stage execution, the system SHALL load matching rule files before loading the task file.

#### Scenario: Rules loaded first
- **WHEN** stage `design-screen:intake` executes
- **THEN** matching rules from `design/rules/` are loaded into context before `intake--design-screen.md` is read
