## MODIFIED Requirements

### Requirement: Simplified 4-step visual pipeline

The visual comparison pipeline SHALL use 6 steps: `storybook-preview`, `screenshot`, `inspect`, `resolve-reference`, `visual-compare`, `polish`.

#### Scenario: Full pipeline execution
- **WHEN** a visual comparison workflow runs
- **THEN** steps execute in order:
  1. `storybook-preview` — ensure Storybook is running
  2. `screenshot` — capture Storybook screenshots at referenced breakpoints
  3. `inspect` — extract structured data from rendered pages via playwright-cli
  4. `resolve-reference` — fetch reference images by type (url, image, stitch, etc.)
  5. `visual-compare` — AI evaluates screenshots + inspect data + references
  6. `polish` — fix loop for identified issues

#### Scenario: Pipeline without inspect step
- **WHEN** a project has no inspect tasks matching (no `when` conditions met)
- **THEN** the pipeline runs: `storybook-preview` → `screenshot` → `resolve-reference` → `visual-compare` → `polish`
- **AND** `inspect` step is skipped (no tasks resolved)

## ADDED Requirements

### Requirement: Inspect step present in all design workflow definitions

The `inspect` step SHALL be declared in the test stage of `design-shell.md`, `design-screen.md`, and `design-verify.md` workflow definitions.

#### Scenario: design-shell includes inspect step
- **WHEN** the design-shell workflow definition is loaded
- **THEN** its test stage includes `inspect` between `screenshot` and `resolve-reference`:
  ```yaml
  test:
    each: scene
    steps: [storybook-preview, screenshot, inspect, resolve-reference, visual-compare, polish]
  ```

#### Scenario: design-screen includes inspect step
- **WHEN** the design-screen workflow definition is loaded
- **THEN** its test stage includes `inspect` in the same position

#### Scenario: design-verify includes inspect step
- **WHEN** the design-verify workflow definition is loaded
- **THEN** its test stage includes `inspect` in the same position

### Requirement: devtools-context rule removed

The `devtools-context.md` rule SHALL be deleted. Its functionality is fully replaced by the `inspect-storybook` and `inspect-stitch` tasks.

#### Scenario: No devtools MCP references in loaded rules
- **WHEN** any design workflow runs
- **THEN** no loaded rule references `mcp__devtools__*` tools
- **AND** computed style extraction is handled by `inspect-storybook.md` via playwright-cli
