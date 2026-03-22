## ADDED Requirements

### Requirement: YAML frontmatter workflow metadata
Workflow and skill markdown files SHALL declare workflow metadata in YAML frontmatter:
```yaml
---
workflow:
  title: Human-readable title
  tasks:
    - id: <task-id>
      title: <task-title>
      type: <task-type>
---
```

#### Scenario: Frontmatter is parsed on workflow start
- **WHEN** a debo-* workflow file contains frontmatter with `workflow:` block
- **THEN** the AI extracts the title and tasks array

#### Scenario: Tasks are created from frontmatter
- **WHEN** frontmatter contains `workflow.tasks` array
- **THEN** `designbook-workflow create` is called with all tasks defined

### Requirement: !WORKFLOW_FILE marker
Workflow and skill files SHALL use the `!WORKFLOW_FILE <task-id>: <path>` marker to declare file production.

#### Scenario: Marker indicates file creation point
- **WHEN** a step in a workflow contains `!WORKFLOW_FILE create-tokens: design-system/design-tokens.yml`
- **THEN** the AI knows that this step will create/modify that file

#### Scenario: Multiple files per task
- **WHEN** a task produces multiple files, each SHALL have its own `!WORKFLOW_FILE` marker
- **THEN** each file is independently registered and validated

### Requirement: !WORKFLOW_DONE marker
Workflow files SHALL use the `!WORKFLOW_DONE` marker to signal workflow completion.

#### Scenario: Marks end of workflow
- **WHEN** the `!WORKFLOW_DONE` marker is reached in a workflow
- **THEN** all tasks must be done and the workflow auto-archives

### Requirement: Markers are declarative, not imperative
Markers are documentation/signals for the AI to understand workflow structure; the AI is responsible for executing the corresponding CLI commands.

#### Scenario: AI implements marker semantics
- **WHEN** the AI reads a `!WORKFLOW_FILE <task-id>: <path>` marker
- **THEN** the AI calls `designbook-workflow update $WORKFLOW_NAME <task-id> --files <path>` to register the file
