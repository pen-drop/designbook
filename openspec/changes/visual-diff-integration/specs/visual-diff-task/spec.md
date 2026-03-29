## ADDED Requirements

### Requirement: Visual-diff task screenshots and compares Storybook scenes against design references

The `designbook/design/tasks/visual-diff.md` task SHALL screenshot the current Storybook scene, resolve the design reference from the scene file, collect design context as text metadata, and perform an AI visual comparison producing a structured report.

#### Scenario: Scene with stitch reference
- **WHEN** the visual-diff task runs for a scene with `reference: { type: stitch, url: "stitch://..." }`
- **THEN** the task runs `_debo screenshot --scene <scene-ref>` to capture the Storybook screenshot
- **AND** delegates reference resolution to `designbook-stitch` skill's `resolve-reference` task
- **AND** reads both images and compares them with design context

#### Scenario: Scene with URL reference
- **WHEN** the visual-diff task runs for a scene with `reference: { type: url, url: "https://..." }`
- **THEN** the task fetches the reference image directly via WebFetch
- **AND** no provider skill is loaded

#### Scenario: Scene with no reference — task skipped
- **WHEN** the visual-diff task runs for a scene without a `reference` block
- **THEN** the task calls `workflow done` with status skipped
- **AND** reports "No design reference for scene X — visual diff skipped"

### Requirement: Visual-diff task collects design context as text metadata

The visual-diff task SHALL collect structured text context alongside images to improve AI comparison quality. This context is passed as text in the comparison prompt, not as additional images.

#### Scenario: Design tokens available
- **WHEN** `$DESIGNBOOK_DATA/design-system/design-tokens.yml` exists
- **THEN** the task includes a summary of primary colors, font families, base spacing, and breakpoints in the comparison prompt

#### Scenario: Scene definition provides component context
- **WHEN** the scene file contains component references and entity mappings
- **THEN** the task includes the list of components used, their slot structure, and entity types in the comparison prompt

#### Scenario: Guidelines provide principles context
- **WHEN** `$DESIGNBOOK_DATA/design-system/guidelines.yml` exists and contains `principles`
- **THEN** the task includes the design principles as comparison criteria

### Requirement: Visual-diff report uses structured format

The visual-diff task SHALL produce a comparison report as a markdown table with element, match status, issue description, and severity.

#### Scenario: Report with issues found
- **WHEN** the AI comparison detects differences
- **THEN** the report contains rows for Layout, Colors, Fonts, Spacing, Icons
- **AND** each row has a match indicator (pass/fail), issue description, and severity (Critical, Major, Minor)

#### Scenario: Report with all elements matching
- **WHEN** the AI comparison detects no significant differences
- **THEN** the report shows all elements as passing with no issues

### Requirement: Visual-diff task is shared across design workflows

The task file `designbook/design/tasks/visual-diff.md` SHALL have no `when` condition (universal match). It is referenced by the `visual-diff` step in the test stage of design-shell, design-screen, and design-component workflows.

#### Scenario: Task resolves for design-shell workflow
- **WHEN** the design-shell workflow reaches its test stage
- **THEN** `designbook/design/tasks/visual-diff.md` is resolved for the `visual-diff` step

#### Scenario: Task resolves for design-screen workflow
- **WHEN** the design-screen workflow reaches its test stage
- **THEN** the same `visual-diff.md` task file is resolved

### Requirement: design-shell, design-screen, design-component declare test stage

Each design workflow SHALL declare a `test` stage with `steps: [visual-diff]` in its frontmatter.

#### Scenario: design-shell with test stage
- **WHEN** the design-shell workflow is loaded
- **THEN** its frontmatter contains `stages: { execute: { steps: [...] }, test: { steps: [visual-diff] } }`

#### Scenario: design-screen with test stage
- **WHEN** the design-screen workflow is loaded
- **THEN** its frontmatter contains `stages: { execute: { steps: [...] }, test: { steps: [visual-diff] } }`

#### Scenario: design-component with test stage
- **WHEN** the design-component workflow is loaded
- **THEN** its frontmatter contains `stages: { execute: { steps: [...] }, test: { steps: [visual-diff] } }`

### Requirement: design-test workflow removed

The standalone `design-test` workflow at `designbook/design/workflows/design-test.md` and its task file `designbook/design/tasks/visual-diff--design-test.md` SHALL be removed. Visual diff is now handled by the test stage of each design workflow.

#### Scenario: design-test workflow no longer exists
- **WHEN** a user runs `debo design-test`
- **THEN** the command is not recognized as a valid workflow

### Requirement: Reference resolution delegates to provider skill by type

The visual-diff task SHALL read `scene.reference.type` and load the `resolve-reference` task from skill `designbook-{type}`. The provider task returns the local path to the downloaded reference image.

#### Scenario: Stitch reference type
- **WHEN** `reference.type` is `stitch`
- **THEN** the task loads `designbook-stitch/tasks/resolve-reference.md` instructions
- **AND** follows those instructions to obtain the reference image

#### Scenario: Unknown reference type
- **WHEN** `reference.type` is an unrecognized value (not stitch, url, or image)
- **THEN** the task reports a warning and skips comparison
- **AND** the workflow continues (non-blocking)
