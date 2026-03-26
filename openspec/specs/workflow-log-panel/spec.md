# workflow-log-panel Specification

## Requirements

### Requirement: Compact workflow display
The panel SHALL render each workflow as a title row followed by stage badges. Each stage badge SHALL show a status icon and task count (e.g., `✅ create-component (4)`). Individual task rows and file rows SHALL NOT appear in the panel.

#### Scenario: Workflow with stages renders compact badges
- **WHEN** a workflow has stages `create-component` (4 tasks, all done) and `validate` (2 tasks, pending)
- **THEN** the panel renders: workflow title row, then `✅ create-component (4)` and `○ validate (2)` as inline badges

#### Scenario: Stage badge status derivation
- **WHEN** a stage has at least one task with status `incomplete`
- **THEN** the stage badge shows `❌`
- **WHEN** a stage has at least one task `in-progress` and none `incomplete`
- **THEN** the stage badge shows `⚡`
- **WHEN** all tasks in a stage are `done`
- **THEN** the stage badge shows `✅`
- **WHEN** all tasks in a stage are `pending`
- **THEN** the stage badge shows `○`

### Requirement: Workflow row wrapped in ContextAction
The workflow title row SHALL be wrapped in `ContextAction` with the log file path (`{designbookDir}/workflows/{changes|archive}/{changeName}/tasks.yml`), providing click on the ellipsis (⋮) button of "Copy log path" and "Open log in IDE".

#### Scenario: Right-click workflow row
- **WHEN** user click on the ellipsis (⋮) button ofs the workflow title row
- **THEN** a context menu appears with "Copy path" and "Open in editor" pointing to the workflow's tasks.yml

### Requirement: Stage badge wrapped in ContextAction
Each stage badge SHALL be wrapped in `ContextAction` with the stage's `task_file` as primary path and loaded rule files as `extraLinks`.

#### Scenario: Right-click stage badge with 2 rules
- **WHEN** user click on the ellipsis (⋮) button ofs a stage badge that has `task_file` and 2 `rules` in `stage_loaded`
- **THEN** a context menu shows "Copy path" and "Open in editor" for the task_file, plus extra entries for each rule file

### Requirement: ContextAction component
A reusable `ContextAction` wrapper component SHALL wrap any children element and provide a menu via an ellipsis (⋮) button using `WithTooltip trigger="click"` + `TooltipLinkList`. It SHALL accept a `path` prop (absolute) for "Copy path" and "Open in editor" actions. "Open in editor" SHALL use Storybook's `api.openInEditor({ file })` from `storybook/manager-api` to open the file in the user's configured editor. It SHALL accept an optional `validation` prop to display validation status in the menu. It SHALL accept an optional `extraLinks` prop for additional context menu entries.

#### Scenario: Right-click on ContextAction-wrapped element
- **WHEN** user click on the ellipsis (⋮) button ofs on any element wrapped by `ContextAction` with `path="/home/user/project/designbook/components/hero/hero.component.yml"`
- **THEN** a context menu appears with "Copy path" and "Open in editor" entries
- **WHEN** user clicks "Open in editor"
- **THEN** `api.openInEditor({ file: "/home/user/project/designbook/components/hero/hero.component.yml" })` is called

#### Scenario: ContextAction with validation info
- **WHEN** `ContextAction` is rendered with a `validation` prop showing `{ valid: true, last_validated: "14:23", type: "component" }`
- **THEN** the context menu includes a disabled info row showing "✅ component · 14:23"

#### Scenario: ContextAction with extraLinks
- **WHEN** `ContextAction` is rendered with `extraLinks` containing entries for rule files
- **THEN** the context menu includes those additional entries after the standard Copy/Open entries

### Requirement: Server provides designbookDir
The `/__designbook/workflows` endpoint SHALL return `{ designbookDir, workflows }` instead of a bare array, so the panel can construct absolute file paths.

#### Scenario: Workflows endpoint includes designbookDir
- **WHEN** the panel fetches `/__designbook/workflows`
- **THEN** the response includes `designbookDir` (absolute path) and `workflows` (array of WorkflowTaskFileWithMeta)

### Requirement: stage_loaded data in API response
The workflow data sent to the panel SHALL include `stage_loaded` for each workflow, so stage tabs can display loaded skills, rules, and config.

#### Scenario: Workflow data includes stage_loaded
- **WHEN** a workflow has `stage_loaded` data in its tasks.yml
- **THEN** the `/__designbook/workflows` response includes `stage_loaded` for that workflow
