## ADDED Requirements

### Requirement: designbook-stitch skill provides resolve-reference task

The `designbook-stitch` skill SHALL provide a `tasks/resolve-reference.md` task that resolves a `stitch://` reference URL to a local PNG image path using the Stitch MCP server.

#### Scenario: Resolve stitch reference to image
- **WHEN** the resolve-reference task receives a reference with `type: stitch` and `url: stitch://project-id/screen-id`
- **THEN** it calls `mcp__stitch__get_screen` with the screen ID
- **AND** fetches the screenshot from `screenshot.downloadUrl` via WebFetch
- **AND** saves the image to a local temporary path
- **AND** returns the local image path

#### Scenario: Stitch MCP unavailable
- **WHEN** the Stitch MCP server is not configured or returns an error
- **THEN** the task reports a clear error message indicating Stitch MCP is unavailable
- **AND** the visual-diff task skips comparison (non-blocking)

#### Scenario: Screen not found in Stitch
- **WHEN** the screen ID from the reference URL does not exist in Stitch
- **THEN** the task reports which screen ID was not found
- **AND** the visual-diff task skips comparison (non-blocking)

### Requirement: designbook-stitch skill provides list-screens task

The `designbook-stitch` skill SHALL provide a `tasks/list-screens.md` task that lists available screens from a Stitch project for reference selection during design intake workflows.

#### Scenario: List screens for reference selection
- **WHEN** the list-screens task runs during a design intake step
- **THEN** it calls `mcp__stitch__list_screens` with the project from guidelines.yml `design_tool.project`
- **AND** returns a numbered list of screens with titles for user selection

#### Scenario: No project configured
- **WHEN** `guidelines.yml` does not contain `design_tool.project`
- **THEN** the task calls `mcp__stitch__list_projects` first
- **AND** asks the user to select a project before listing screens

### Requirement: designbook-stitch skill follows addon skill conventions

The `designbook-stitch` skill SHALL follow the designbook addon skill directory structure with SKILL.md, tasks/, and rules/ directories.

#### Scenario: Skill directory structure
- **WHEN** the designbook-stitch skill is created
- **THEN** it has the structure:
  ```
  .agents/skills/designbook-stitch/
  ├── SKILL.md
  └── tasks/
      ├── resolve-reference.md
      └── list-screens.md
  ```

#### Scenario: SKILL.md metadata
- **WHEN** the SKILL.md is loaded
- **THEN** it has `name: designbook-stitch`, `user-invocable: false`, and `disable-model-invocation: true`
