## REMOVED Requirements

### Requirement: Workflow detail modal
**Reason**: Replaced by inline collapsible hierarchy. The modal-based detail view is no longer needed as all workflow/stage/task information is displayed directly in the panel via nested collapsibles.
**Migration**: Workflow details are now visible inline — click the collapsible chevron instead of opening a modal.

### Requirement: Overview tab content
**Reason**: Overview information (status, timestamps, parent) moves into the workflow collapsible summary row. No separate tab needed.
**Migration**: Status and timestamps visible directly in the workflow summary row.

### Requirement: Stage tab content
**Reason**: Stage information moves into the stage collapsible. Loaded resources (task_file, rules) accessible via ContextAction menus on stage headers.
**Migration**: Stage tasks visible inline via collapsible. Loaded resources accessible via ⋮ menu on stage header.
