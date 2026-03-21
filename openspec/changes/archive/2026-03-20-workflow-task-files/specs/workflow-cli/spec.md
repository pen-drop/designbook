## ADDED Requirements

### Requirement: CLI SHALL support --workflow-file for static task expansion
The `workflow create` command SHALL accept `--workflow-file <path>` as an alternative to `--tasks '<json>'`. When provided, the CLI reads the workflow frontmatter, resolves each task file, and creates the workflow with all tasks expanded.

#### Scenario: Create from workflow file
- **WHEN** user runs `workflow create --workflow-file .agents/workflows/debo-design-shell.md`
- **THEN** the CLI reads the `workflow.tasks[]` frontmatter array
- **AND** for each task entry, reads the referenced task file's `files` array (with params substituted)
- **AND** creates `tasks.yml` with all tasks and their file lists

#### Scenario: Dynamic workflows not supported via --workflow-file
- **WHEN** a workflow frontmatter declares `tasks: dynamic`
- **THEN** `--workflow-file` SHALL exit with an error: "Dynamic task list — use --tasks '<json>' after completing user dialog"
