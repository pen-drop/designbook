## NEW Requirements

### Requirement: test stage tasks run after preview is ready

Tasks with `type: test` declared in workflow skills run after all non-test tasks are complete and the preview Storybook is running. Test tasks receive `DESIGNBOOK_PREVIEW_URL` and run their checks before the user is prompted to merge.

#### Scenario: test tasks collected at plan time
- **WHEN** `workflow plan` processes items and a stage item has `type: test`
- **THEN** the corresponding task is added to `tasks.yml` with `type: test`
- **THEN** test tasks are listed after all non-test tasks in the task order

#### Scenario: test tasks receive DESIGNBOOK_PREVIEW_URL
- **WHEN** a test task begins execution
- **THEN** `DESIGNBOOK_PREVIEW_URL` is set to the running preview Storybook URL
- **THEN** the task can use this URL to run visual tests, screenshots, or other checks

#### Scenario: test stage skipped when no test tasks declared
- **WHEN** the workflow has no tasks with `type: test`
- **THEN** after final non-test task commit and preview start, `workflow done` outputs review status immediately

#### Scenario: test tasks run in declaration order
- **WHEN** multiple test tasks are declared
- **THEN** they run in the order declared in the workflow skill

#### Scenario: test task failure blocks merge prompt
- **WHEN** a test task completes with validation errors
- **THEN** the test results are included in the review status output
- **THEN** the user sees the failures before deciding whether to merge
