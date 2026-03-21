# workflow-features Specification

## Purpose
Defines optional workflow capabilities: before/after hooks and workflow resume.

---

## Requirement: Workflow frontmatter supports before/after hook declarations

```yaml
---
workflow:
  title: Design Screen
  stages: [dialog, create-component, create-scene]
  before:
    - workflow: debo-sample-data
      execute: if-never-run
  after:
    - workflow: debo-design-guideline
---
```

---

## Requirement: Before hooks execute after dialog, before tasks

### Scenario: Before hook timing
- **WHEN** the dialog stage completes
- **THEN** the AI processes all `before` hooks before creating the workflow plan or executing any tasks

### Scenario: Three execution policies

- `execute: always` — run the referenced workflow without asking (if `reads:` satisfied)
- `execute: if-never-run` — run only if `workflow list --workflow <id> --include-archived` returns empty
- `execute: ask` — prompt the user whether to run it

### Scenario: Reads act as a gate
- **WHEN** a before hook's referenced workflow has required `reads:` files that don't exist
- **THEN** the before hook is skipped silently regardless of `execute` policy

---

## Requirement: After hooks always prompt the user

### Scenario: After hook prompt
- **WHEN** the current workflow's last task completes
- **AND** `after` entries are declared
- **THEN** the AI prompts the user for each in order; user may accept or decline each

---

## Requirement: Hook-triggered workflows store their parent

### Scenario: Parent stored in tasks.yml
- **WHEN** workflow A triggers workflow B via a hook
- **THEN** `--parent $WORKFLOW_NAME_A` is passed to B's `workflow create`
- **AND** B's tasks.yml contains `parent: <workflow-A-name>`

---

## Requirement: CLI provides workflow list command

`workflow list --workflow <id>` lists all unarchived workflows for a given id, newest first.

### Scenario: No existing workflows
- **WHEN** no unarchived workflow with that id exists
- **THEN** the command prints nothing, exits 0

### Scenario: One or more existing workflows
- **WHEN** unarchived workflows exist
- **THEN** each name is printed on a separate line, newest first

---

## Requirement: AI checks for existing workflows before creating

### Scenario: AI offers resume
- **WHEN** `workflow list` returns one or more names
- **THEN** the AI asks: "There is an unfinished workflow: <name>. Continue it, or start fresh?"
- **WHEN** user chooses continue, the AI uses the existing `$WORKFLOW_NAME` and skips `workflow create`
- **WHEN** user chooses start fresh, the AI calls `workflow create` for a new name
