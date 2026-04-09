## ADDED Requirements

### Requirement: Top-level "Visual" tab for scene stories

When viewing a scene story, a "Visual" tab SHALL appear alongside Canvas and Docs (using Storybook `types.TAB`). The tab shows screenshots, references, comparison, and report for that scene.

#### Scenario: Scene story with screenshots available
- **WHEN** the user views a scene story
- **AND** screenshots exist in `designbook/screenshots/{storyId}/`
- **THEN** the "Visual" tab appears alongside Canvas/Docs with sub-tabs: Screenshots, References, Compare, Report

#### Scenario: Scene story without screenshots
- **WHEN** the user views a scene story
- **AND** no screenshots directory exists for the scene
- **THEN** the Visual tab shows an empty state with the command to generate screenshots

#### Scenario: Non-scene story
- **WHEN** the user views a story that is not a scene (no `parameters.scene` in story metadata)
- **THEN** the Visual tab shows empty state (tab is always registered but content is contextual)

### Requirement: Screenshots tab shows breakpoint grid

The Screenshots sub-tab SHALL display all breakpoint screenshots for the current scene in a responsive grid.

#### Scenario: Multiple breakpoint screenshots
- **WHEN** the scene has screenshots at desktop, sm, md, lg breakpoints
- **THEN** each screenshot is shown as a card with the breakpoint label and viewport size
- **AND** the cards are arranged in a responsive grid

#### Scenario: Single screenshot
- **WHEN** only a desktop screenshot exists
- **THEN** a single screenshot card is shown

### Requirement: References tab shows breakpoint grid

The References sub-tab SHALL display all reference images for the current scene in a responsive grid, using the same layout as the Screenshots tab.

#### Scenario: Per-breakpoint references available
- **WHEN** the scene has reference images at desktop and sm breakpoints
- **THEN** each reference is shown as a card with the breakpoint label

#### Scenario: No references
- **WHEN** no reference images exist for the scene
- **THEN** the tab shows an empty state: "No references configured for this scene"

### Requirement: Compare tab shows side-by-side view

The Compare sub-tab SHALL display screenshot and reference side-by-side per breakpoint.

#### Scenario: Matching pairs available
- **WHEN** both screenshot and reference exist for a breakpoint
- **THEN** they are shown side-by-side (screenshot left, reference right) with breakpoint label
- **AND** multiple breakpoint pairs are stacked vertically

#### Scenario: Screenshot without reference
- **WHEN** a screenshot exists but no reference for that breakpoint
- **THEN** the screenshot is shown alone with a note "No reference for this breakpoint"

#### Scenario: Narrow viewport
- **WHEN** the tab viewport is narrower than 600px
- **THEN** the side-by-side layout stacks vertically (screenshot above, reference below)

### Requirement: Report tab shows visual-compare report

The Report sub-tab SHALL render the `report.md` file as formatted HTML.

#### Scenario: Report available
- **WHEN** `screenshots/{sceneName}/report.md` exists
- **THEN** the report is rendered as HTML (tables, headings, severity badges)

#### Scenario: No report
- **WHEN** no report.md exists
- **THEN** the tab shows empty state: "No visual comparison report yet"

### Requirement: Tab reads scene context from story parameters

The Visual tab SHALL use the current story's ID to derive the screenshot directory path (`designbook/screenshots/{storyId}/`).

#### Scenario: Story ID maps to screenshot directory
- **WHEN** the current story has ID `designbook-design-system--shell`
- **THEN** the tab looks for screenshots in `designbook/screenshots/designbook-design-system--shell/`

### Requirement: Images served via /__designbook/load endpoint

All screenshots and references SHALL be loaded via the existing `/__designbook/load?path=` endpoint.

#### Scenario: Screenshot image loaded
- **WHEN** the tab displays a screenshot
- **THEN** the img src is `/__designbook/load?path=designbook/screenshots/{storyId}/storybook/sm.png`

### Requirement: DeboSectionPage screenshots tab removed

The section-level Screenshots tab in `DeboSectionPage` SHALL be removed. Visual artifacts are now per-scene in the Visual tab.

#### Scenario: Section page without screenshots tab
- **WHEN** the user views a section page
- **THEN** tabs are: Spec, Sample Data, Design (no Screenshots tab)
