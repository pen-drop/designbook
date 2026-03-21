## ADDED Requirements

### Requirement: Panel displays workflow status with three-state icons
The Storybook panel's Workflows tab SHALL display a visual icon for each workflow based on its status field.

#### Scenario: Planning workflows show paper icon
- **WHEN** a workflow has `status: planning`
- **THEN** the workflow row in the panel displays 📋 icon

#### Scenario: Running workflows show lightning icon
- **WHEN** a workflow has `status: running`
- **THEN** the workflow row displays ⚡ icon

#### Scenario: Completed workflows show checkmark icon
- **WHEN** a workflow has `status: completed`
- **THEN** the workflow row displays ✅ icon

### Requirement: Status field is read from workflow data
The panel SHALL read the `status` field from the workflow JSON returned by `/__designbook/workflows` API.

#### Scenario: API includes status field
- **WHEN** the `/__designbook/workflows` endpoint returns workflow data
- **THEN** each workflow object includes a `status: 'planning' | 'running' | 'completed'` field

#### Scenario: Panel updates on status change
- **WHEN** a workflow's status changes (e.g., from `planning` to `running`)
- **THEN** the panel's icon and styling update to reflect the new status within 3 seconds (via SSE/polling)

### Requirement: Styling reflects workflow state
Planning workflows MAY have reduced opacity or styling to indicate they haven't started. Running and completed workflows have normal styling.

#### Scenario: Planning workflows appear less prominent
- **WHEN** a workflow is in `planning` status
- **THEN** it may have slightly reduced opacity to visually distinguish it from running/completed workflows
