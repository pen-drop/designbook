## ADDED Requirements

### Requirement: Per-workflow fixture directories
Each tested workflow SHALL have its own fixture directory at `promptfoo/fixtures/<workflow-name>/` containing exactly the prerequisite files that workflow needs to execute.

#### Scenario: product-vision has empty fixture
- **WHEN** the `debo-product-vision` test runs
- **THEN** its fixture directory SHALL contain only `designbook.config.yml` (no prerequisite files needed)

#### Scenario: product-sections has product vision fixture
- **WHEN** the `debo-product-sections` test runs
- **THEN** its fixture directory SHALL contain `designbook.config.yml` and `product/product-overview.md`

#### Scenario: design-screen has full fixture
- **WHEN** the `debo-design-screen` test runs
- **THEN** its fixture directory SHALL contain `designbook.config.yml`, `product/product-overview.md`, `sections/*/spec.section.yml`, `design-system/design-tokens.md`, `data-model.yml`, `components/*/`, and `sections/*/data.yml`

### Requirement: Workspace isolation
Each test execution SHALL write output to an isolated workspace directory at `promptfoo/workspaces/<workflow>--<provider>/designbook/`. No two tests SHALL share a workspace directory.

#### Scenario: Parallel provider execution
- **WHEN** `debo-product-vision` runs with both `gemini-3-pro` and `claude-opus-4-6`
- **THEN** gemini output SHALL be in `promptfoo/workspaces/debo-product-vision--gemini/designbook/`
- **AND** claude output SHALL be in `promptfoo/workspaces/debo-product-vision--claude/designbook/`

#### Scenario: Workspace contains local config
- **WHEN** a workspace is set up for a test
- **THEN** it SHALL contain a `designbook.config.yml` with `dist: ./designbook`

### Requirement: Clean command
A clean script SHALL exist at `promptfoo/scripts/clean.sh` that removes all workspace output directories before a test run.

#### Scenario: Clean removes workspaces
- **WHEN** `promptfoo/scripts/clean.sh` is executed
- **THEN** the `promptfoo/workspaces/` directory SHALL be removed
- **AND** the `promptfoo/fixtures/` directory SHALL NOT be affected

### Requirement: Deterministic all-in-one prompts
Each workflow test SHALL use a single prompt that provides all required inputs, bypassing multi-turn conversation. The prompt SHALL specify exact values to use.

#### Scenario: Product vision prompt specifies all values
- **WHEN** the `debo-product-vision` test prompt is rendered
- **THEN** it SHALL contain the product name, description, problems, solutions, and features to use
- **AND** it SHALL instruct the agent not to ask questions

#### Scenario: Prompts reference workspace path
- **WHEN** a test prompt is rendered
- **THEN** it SHALL include the workspace-specific `DESIGNBOOK_DIST` path using promptfoo template variables

### Requirement: Consistent test product
All workflow tests SHALL use the same fictional product ("PetMatch" — a pet adoption platform) to ensure cross-workflow consistency.

#### Scenario: Fixture data references PetMatch
- **WHEN** a fixture includes `product/product-overview.md`
- **THEN** the product name SHALL be "PetMatch"
- **AND** the content SHALL describe a pet adoption platform

### Requirement: LLM-rubric assertions
All test assertions SHALL use promptfoo's `llm-rubric` assertion type. No custom Python, JavaScript, or shell assertion scripts SHALL be used.

#### Scenario: Assertion validates structural output
- **WHEN** a test assertion is evaluated
- **THEN** the `llm-rubric` SHALL verify that the agent created the expected output files
- **AND** SHALL verify that the output contains the expected structural sections

### Requirement: Dual-provider testing
Each workflow test SHALL be configured to run with both `gemini-3-pro` and `claude-opus-4-6` providers.

#### Scenario: Both providers configured
- **WHEN** a workflow's `promptfooconfig.yaml` is read
- **THEN** it SHALL list both `gemini-3-pro` and `claude-opus-4-6` as providers with `opencode:sdk` provider ID

### Requirement: Workflow coverage
The test suite SHALL cover the following core debo-workflows: `product-vision`, `product-sections`, `design-tokens`, `data-model`, `css-generate`, `shape-section`, `design-component`, `sample-data`, `design-screen`, `design-shell`.

#### Scenario: All core workflows have test entries
- **WHEN** the test suite is complete
- **THEN** the unified `promptfoo/workflows/promptfooconfig.yaml` SHALL contain a test entry for each listed workflow
- **AND** each workflow SHALL have a corresponding prompt file in `promptfoo/workflows/prompts/`

## MODIFIED Requirements

### Requirement: Categorized directory layout
All promptfoo configuration files SHALL reside under a top-level `promptfoo/` directory. Workflow tests SHALL use a **single unified** `promptfoo/workflows/promptfooconfig.yaml` with all workflow test cases as `tests:` entries. Prompt files SHALL be in `promptfoo/workflows/prompts/`. Skill tests SHALL be in `promptfoo/skills/`. Additionally, the `promptfoo/` directory SHALL contain `fixtures/` (per-workflow input files), `workspaces/` (test execution output, gitignored), and `scripts/` (utility scripts).

#### Scenario: Directory structure exists
- **WHEN** the restructuring is complete
- **THEN** `promptfoo/workflows/promptfooconfig.yaml` SHALL exist as the single unified workflow test config
- **AND** `promptfoo/workflows/prompts/` SHALL contain one prompt file per workflow
- **AND** the directory `promptfoo/skills/` SHALL exist for skill-level tests
- **AND** the directory `promptfoo/fixtures/` SHALL exist with per-workflow fixture directories
- **AND** the directory `promptfoo/scripts/` SHALL exist with `clean.sh`

#### Scenario: No promptfoo files in root
- **WHEN** the restructuring is complete
- **THEN** `promptfooconfig.yaml`, `promptfoo-test-blog.yaml`, `blog_prompt.txt`, `verify_blog_spec.py`, and `README_promptfoo.md` SHALL NOT exist in the project root

### Requirement: Centralized report output
The unified config SHALL write eval results to `promptfoo/reports/` via the `outputPath` config key.

#### Scenario: Report output location
- **WHEN** `promptfoo eval -c promptfoo/workflows/promptfooconfig.yaml` is run
- **THEN** the eval results SHALL be written to `promptfoo/reports/workflows.json`

#### Scenario: Filtered execution
- **WHEN** a single workflow test is run via `npx promptfoo eval --filter-description "debo-product-vision"`
- **THEN** only the matching test SHALL execute

### Requirement: Per-workflow assertion specifics
Each workflow's `llm-rubric` assertion SHALL validate the specific files and structural output that workflow produces, as defined by the workflow's SKILL.md and delegated skills.

#### Scenario: product-vision assertion
- **WHEN** `debo-product-vision` completes
- **THEN** the rubric SHALL verify `product/product-overview.md` was created with: level-1 heading containing "PetMatch", `## Description` (1-3 sentences), `## Problems & Solutions` (≥2 pairs), and `## Key Features` (≥3 items)

#### Scenario: product-sections assertion
- **WHEN** `debo-product-sections` completes
- **THEN** the rubric SHALL verify 3-5 `sections/[id]/spec.section.yml` files were created, each containing `id` (kebab-case), `title`, `description`, `status: planned`, and sequential `order` values

#### Scenario: design-tokens assertion
- **WHEN** `debo-design-tokens` completes
- **THEN** the rubric SHALL verify `design-system/design-tokens.yml` contains a `color` group with ≥3 tokens (each with `$value` in hex, `$type: color`) and a `typography` group with `heading`, `body`, `mono` tokens (`$type: fontFamily`)

#### Scenario: data-model assertion
- **WHEN** `debo-data-model` completes
- **THEN** the rubric SHALL verify `data-model.yml` has a top-level `content` key with ≥1 entity_type containing ≥1 bundle, each bundle having a `fields` object with `type` and `label` per field

#### Scenario: css-generate assertion
- **WHEN** `debo-css-generate` completes
- **THEN** the rubric SHALL verify CSS files were generated under `css/tokens/` and/or `css/themes/` with `.src.css` extension, and that `app.src.css` was updated with `@import` lines

#### Scenario: shape-section assertion
- **WHEN** `debo-shape-section` completes
- **THEN** the rubric SHALL verify `sections/[id]/spec.md` was created with: `# [Title] Specification`, `## Overview` (2-3 sentences), `## User Flows` (≥2 flows), `## UI Requirements` (≥2 items), and `## Configuration` with `shell:` setting

#### Scenario: design-component assertion
- **WHEN** `debo-design-component` completes
- **THEN** the rubric SHALL verify a component directory was created under `components/` containing `.component.yml` (with `name`, `status`, `group`, `provider`), `.twig`, and ≥1 `.story.yml`, all sharing the same kebab-case base name

#### Scenario: sample-data assertion
- **WHEN** `debo-sample-data` completes
- **THEN** the rubric SHALL verify `sections/[id]/data.yml` was created with `_meta` (containing `models` and `relationships`), ≥1 entity type array with ≥5 total records, each record having an `id` field, using realistic (non-lorem) content

#### Scenario: design-screen assertion
- **WHEN** `debo-design-screen` completes
- **THEN** the rubric SHALL verify: a multi-phase plan was generated, `*.screen.yml` files were created under `sections/[id]/screens/` with `name`, `section`, and `layout` keys, entity entries use `entity_type.bundle` format, and CSS generation was executed

#### Scenario: design-shell assertion
- **WHEN** `debo-design-shell` completes
- **THEN** the rubric SHALL verify `design-shell/shell-spec.md` was created with: `# Application Shell`, `## Navigation Structure` (with nav items mapped to sections), `## Layout Pattern`, and `## Responsive Behavior` (with desktop/tablet/mobile subsections)

### Requirement: Addon integration testing
A minimum addon integration test SHALL verify that the `storybook-addon-designbook` correctly renders designbook content generated by workflows. The test SHALL run against the PetMatch workspace output with Storybook running.

#### Scenario: Addon renders data model
- **WHEN** the addon integration test runs after `debo-data-model` output is in the workspace
- **THEN** the rubric SHALL verify the "Designbook/Data Model" page in Storybook displays entity types, bundles, and fields without rendering errors

#### Scenario: Addon renders design tokens
- **WHEN** the addon integration test runs after `debo-design-tokens` output is in the workspace
- **THEN** the rubric SHALL verify the "Designbook/Design System" page in Storybook displays color tokens with hex values and typography tokens with font names

#### Scenario: Multi-integration support
- **WHEN** a new integration type (e.g., `react`) is added under `packages/integrations/`
- **THEN** the addon integration test SHALL be parameterizable via `vars.integration` and `vars.storybook_port` to test against different integration Storybook instances

### Requirement: Storybook story verification
For workflows that generate `.story.yml` files (`debo-design-component`, `debo-design-screen`), an optional post-execution Storybook verification assertion SHALL check that stories render without errors.

#### Scenario: Stories render in Storybook
- **WHEN** component-generating workflow tests complete and Storybook is running
- **THEN** the rubric SHALL verify the agent used `designbook-component-validate` or navigated to Storybook iframe URLs to confirm story rendering
- **AND** if Storybook is not running, the assertion SHALL NOT fail the test
