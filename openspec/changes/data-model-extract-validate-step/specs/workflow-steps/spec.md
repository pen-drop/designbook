## ADDED Requirements

### Requirement: Create step encapsulates workflow creation
`designbook-workflow/steps/create.md` SHALL document how to create a workflow tracking file, including the CLI command pattern, parameters, and how to capture the workflow name.

#### Scenario: Agent can create a workflow from the step
- **WHEN** a workflow loads `@designbook-workflow/steps/create.md`
- **THEN** the agent knows the exact command: `WORKFLOW_NAME=$(node packages/storybook-addon-designbook/dist/cli.js workflow create --workflow <id> --title "<title>" --task "<id>:<title>:<type>")`

#### Scenario: Workflow name is captured
- **WHEN** the create command runs
- **THEN** the step instructs the agent to capture stdout into `$WORKFLOW_NAME` for use in subsequent steps

---

### Requirement: Update step encapsulates task status updates
`designbook-workflow/steps/update.md` SHALL document how to update a task's status (in-progress or done).

#### Scenario: Agent can set in-progress status
- **WHEN** a workflow loads `@designbook-workflow/steps/update.md`
- **THEN** the agent knows: `node packages/storybook-addon-designbook/dist/cli.js workflow update $WORKFLOW_NAME <task-id> --status in-progress`

#### Scenario: Agent can mark task done
- **WHEN** an agent uses the update step to mark done
- **THEN** the command is `workflow update $WORKFLOW_NAME <task-id> --status done`

---

### Requirement: Add-files step encapsulates file registration
`designbook-workflow/steps/add-files.md` SHALL document how to register produced files with a task using `--files`, and explain the `requires_validation` behavior.

#### Scenario: Files are registered with in-progress status
- **WHEN** a workflow loads `@designbook-workflow/steps/add-files.md`
- **THEN** the agent knows to pass `--files <paths...>` on an `--status in-progress` update (NOT on done)

#### Scenario: Files must be registered before validation
- **WHEN** an agent reads the step
- **THEN** it understands that `--files` must be passed before running `workflow validate`, not after marking done

---

### Requirement: Validate step encapsulates workflow validation
`designbook-workflow/steps/validate.md` SHALL document how to validate all registered files in an active workflow, interpret JSON output, and run the fix loop.

#### Scenario: Agent validates after registering files
- **WHEN** a workflow loads `@designbook-workflow/steps/validate.md`
- **THEN** the agent runs `node packages/storybook-addon-designbook/dist/cli.js workflow validate $WORKFLOW_NAME`

#### Scenario: Fix loop runs until exit 0
- **WHEN** any file has `"valid": false` in the JSON output
- **THEN** the step instructs the agent to fix the file and re-run validate until all pass

#### Scenario: Validate is always called before marking done
- **WHEN** an agent reads the step
- **THEN** it understands validate must complete with exit 0 before the task is marked `--status done` on the last task
