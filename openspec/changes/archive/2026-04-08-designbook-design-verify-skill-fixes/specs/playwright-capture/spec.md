## MODIFIED Requirements

### Requirement: Capture logic centralized in playwright-capture rule

The `playwright-capture.md` rule (renamed from `playwright-session.md`) MUST be the single source of truth for how screenshots are captured. Task files MUST NOT contain inline Playwright commands — they declare only output paths and params. The rule documents two capture modes: full-page via CLI (`npx playwright screenshot --full-page`), element via Node API (`page.locator(selector).screenshot()`).

#### Scenario: Capture-reference task contains no Playwright commands
- Given a capture-reference task for breakpoint "sm" and region "header"
- When the task file is loaded
- Then it declares the output file path (`screenshots/reference/{breakpoint}--{region}.png`)
- And it does NOT contain `npx playwright screenshot` or Node API code
- And the `playwright-capture` rule provides the capture method

#### Scenario: Capture-storybook task contains no Playwright commands
- Given a capture-storybook task for breakpoint "xl" and region "full"
- When the task file is loaded
- Then it declares the output file path (`screenshots/current/{breakpoint}--{region}.png`)
- And it does NOT contain inline Playwright commands

#### Scenario: Playwright-capture rule documents both capture modes
- Given the `playwright-capture` rule is loaded
- When its instructions are read
- Then it documents full-page capture via `npx playwright screenshot --full-page`
- And it documents element capture via Node API `page.locator(selector).screenshot()`
- And it does NOT reference `playwright-cli` or session management

### Requirement: Recapture step loads capture rules

The `recapture` step MUST load the same rules as the `capture` step (`playwright-capture`, `guidelines-context`).

#### Scenario: Rule loading for recapture
- Given a workflow with a recapture step in the polish stage
- When `workflow create` resolves step rules
- Then `playwright-capture.md` is loaded for recapture (via `when.steps` including `recapture`)
- And `guidelines-context.md` is loaded for recapture

### Requirement: Configure-meta-scene uses correct CLI command

The `configure-meta-scene` task MUST reference `_debo story --scene` (not `_debo resolve-url`).

#### Scenario: Story resolution in configure-meta-scene
- Given a configure-meta-scene task for scene "design-system:shell"
- When the task resolves the storyId
- Then it uses `_debo story --scene design-system:shell`

### Requirement: Polish task delegates re-capture to recapture step

The `polish` task MUST NOT contain re-capture instructions. Re-capture is handled by the separate `recapture` step.

#### Scenario: Polish task scope
- Given a polish task in iteration 1
- When the task instructions are loaded
- Then they contain code fix guidance
- And they do NOT contain screenshot capture commands

### Requirement: WorkflowDone rejects tasks with only unresolved placeholders

`workflowDone` MUST NOT auto-complete tasks where all file paths contain unresolved placeholders and no file has been validated or exists on disk.

#### Scenario: Task with unresolved placeholder path
- Given a task with file path `designbook/stories/{storyId}/meta.yml`
- And no `validation_result` is set
- And the file does not exist on disk
- When `workflowDone` is called
- Then the task is NOT marked as done
- And an error indicates unresolved file placeholders

### Requirement: Done handler allows --params on completed tasks

The `done` CLI handler MUST accept `--params` on already-completed tasks to trigger `expandDeferredStages` without erroring.

#### Scenario: Expand deferred stages from done task
- Given a task that is already done
- When `workflow done --task <id> --params '{"test": [...]}'` is called
- Then `expandDeferredStages` runs and creates new tasks
- And the command returns exit code 0 with `expanded_tasks` in response
