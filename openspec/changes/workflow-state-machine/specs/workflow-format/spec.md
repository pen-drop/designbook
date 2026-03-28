# workflow-format Delta Spec (workflow-state-machine change)

---

## MODIFIED Requirements

### Requirement: YAML frontmatter workflow metadata

The `stages:` key changes from a flat list of step names to a grouped object mapping stage names to their steps and optional params.

#### Scenario: Grouped stages format
- **WHEN** a workflow file is parsed
- **THEN** the frontmatter `stages:` is a YAML object:
```yaml
stages:
  execute:
    steps: [intake, create-component, create-scene]
  test:
    steps: [visual-diff]
  preview:
    steps: [storybook-preview]
    params:
      user_approved:
        type: boolean
        prompt: "Preview unter {preview_url} — passt alles?"
```

#### Scenario: Minimal workflow — execute only
- **WHEN** a lightweight workflow declares only execute steps
- **THEN** only the `execute` stage is present:
```yaml
stages:
  execute:
    steps: [intake, create-tokens]
```

#### Scenario: Colon syntax preserved in steps
- **WHEN** a step uses `workflow-id:task` syntax (e.g. `design-screen:intake`)
- **THEN** it works the same as before — the colon syntax is a step reference mechanism, independent of stages

#### Scenario: Stage names are from fixed vocabulary
- **WHEN** a workflow frontmatter declares stages
- **THEN** stage names MUST be from: `execute`, `test`, `preview`
- **AND** unknown stage names cause a validation error at `workflow create` time

---

### Requirement: tasks.yml stores stages object and step/stage fields per task

The `stages` top-level field and per-task fields change shape.

#### Scenario: tasks.yml stages field
- **WHEN** `workflow plan` writes tasks.yml
- **THEN** the top-level `stages` field is an object (not an array):
```yaml
stages:
  execute:
    steps: [intake, create-component]
  test:
    steps: [visual-diff]
```

#### Scenario: Per-task step and stage fields
- **WHEN** a task is written to tasks.yml
- **THEN** it has `step: "create-component"` (the work unit name, previously called `stage`) and `stage: "execute"` (the parent stage name, new field)

---

### Requirement: Step reference resolution — colon syntax

Renamed from "Stage reference resolution" to "Step reference resolution" to match new vocabulary.

#### Scenario: Plain step resolves to shared task
- **WHEN** a step is declared as `create-component` (no colon)
- **THEN** the system scans `**/tasks/create-component.md` across all skill dirs

#### Scenario: Colon step resolves to qualified task file
- **WHEN** a step is declared as `design-screen:intake`
- **THEN** the system resolves via glob `**/intake--design-screen.md`

---

## RENAMED Requirements

### Requirement: Stage reference resolution → Step reference resolution
- **FROM:** Stage reference resolution — colon syntax
- **TO:** Step reference resolution — colon syntax
- **Reason:** "stage" now means the grouping level, not the individual work unit. The resolution mechanism resolves steps (individual tasks), not stages.
