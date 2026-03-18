## MODIFIED Requirements

### Requirement: Workflow skill uses task files for execution instructions
Debo-* workflow files SHALL delegate execution instructions to task files. The workflow body contains only dialog and context-gathering. Execution (creating files, validating, marking done) is driven by the task file referenced per task.

#### Scenario: Workflow execution via task file
- **WHEN** the AI reaches the execution phase (after `workflow create` is called)
- **THEN** for each task, it SHALL load the referenced task file with substituted params
- **AND** follow the task file's body instructions to create the files
- **AND** after creating all files: `workflow validate --task <id>` then `workflow done --task <id>`

#### Scenario: Task file loads its own skill context
- **WHEN** a task file body references `@designbook-components-sdc/SKILL.md`
- **THEN** the AI SHALL load that skill's full context for this task's execution
- **AND** NOT rely on skill context loaded for other tasks

#### Scenario: Plan built from task file frontmatter
- **WHEN** the AI builds the task JSON for `workflow create`
- **THEN** for each task, it reads the task file `files` array and substitutes params
- **AND** the resolved file paths are included in the task JSON
