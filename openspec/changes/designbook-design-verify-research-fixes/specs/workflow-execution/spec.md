## MODIFIED Requirements

### Requirement: Compare tasks write draft issues only
Compare tasks (both markup and screenshot) SHALL write issues exclusively to draft JSON files under `designbook/stories/${storyId}/issues/draft/`. Compare tasks MUST NOT call `_debo story issues --add` or `_debo story check` to publish issues directly to meta. The triage stage is the sole publisher of issues to meta.

#### Scenario: Compare screenshot writes draft only
- **WHEN** a compare-screenshots task completes with visual deviations found
- **THEN** it writes a JSON array to `issues/draft/${breakpoint}--${region}.json` and does NOT call any `_debo story issues` or `_debo story check` CLI commands

#### Scenario: Compare markup writes draft only
- **WHEN** a compare-markup task completes with extraction diffs found
- **THEN** it writes a JSON array to `issues/draft/${breakpoint}--markup.json` and does NOT call any `_debo story issues` or `_debo story check` CLI commands

### Requirement: Triage consolidation produces one issue per distinct fix
The triage stage SHALL create one issue per distinct actionable fix. Two problems that require separate code changes MUST NOT be merged into a single issue, even if they appear in the same component region or check.

#### Scenario: Separate elements in same region become separate issues
- **WHEN** triage reads draft issues containing "Logo icon missing" and "Search button missing" both in the header region
- **THEN** triage creates two separate issues, each with its own ID and description

#### Scenario: Same element across breakpoints becomes one issue
- **WHEN** triage reads draft issues for "Header Logo fontSize 16px→20px" in both sm and xl breakpoints
- **THEN** triage merges them into a single issue noting "Breakpoints: sm, xl"

### Requirement: Polish task title format
The polish task title SHALL use the format `"Polish {id}"` without trailing content. The issue description SHALL be set via the separate `description` frontmatter field.

#### Scenario: Polish task renders with clean title
- **WHEN** a polish task is expanded with id `issue-003`
- **THEN** the task title is `"Polish issue-003"` and the description field contains the full actionable description

### Requirement: Compare markup uses Playwright Node API
The compare-markup task SHALL use the Playwright Node API for DOM extraction. It MUST NOT reference `npx playwright-cli` which does not exist as a package.

#### Scenario: Markup extraction uses Node API
- **WHEN** compare-markup opens a Playwright session for extraction
- **THEN** it uses `const { chromium } = require('playwright')` Node API, not `npx playwright-cli`

### Requirement: Triage documents workflow done with params
The triage task Step 4 SHALL explicitly document passing the issues array via `_debo workflow done --params` rather than suggesting direct YAML editing.

#### Scenario: Triage passes issues via CLI
- **WHEN** triage completes consolidation and needs to write issues for polish expansion
- **THEN** it calls `_debo workflow done --workflow $WF --task $TASK_ID --params '{"issues": [...]}'`

### Requirement: Playwright capture rule step list
The playwright-capture rule `when.steps` SHALL list only steps that exist in active workflows. Vestigial step names MUST be removed.

#### Scenario: No vestigial steps in when.steps
- **WHEN** the playwright-capture rule is loaded
- **THEN** `when.steps` contains `[capture, recapture, compare, polish]` without the unused `verify` step
