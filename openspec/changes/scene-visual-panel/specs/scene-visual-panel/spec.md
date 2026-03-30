## ADDED Requirements

### Requirement: Addon panel shows Visual tab for scene stories

When viewing a scene story, the addon panel SHALL display a "Visual" tab showing screenshots, references, comparison, and report for that scene.

#### Scenario: Scene story with screenshots available
- **WHEN** the user views a scene story
- **AND** screenshots exist in `screenshots/{sceneName}/`
- **THEN** the addon panel shows a "Visual" tab with sub-tabs: Screenshots, References, Compare, Report

#### Scenario: Scene story without screenshots
- **WHEN** the user views a scene story
- **AND** no screenshots directory exists for the scene
- **THEN** the Visual tab shows an empty state with the command to generate screenshots

#### Scenario: Non-scene story
- **WHEN** the user views a story that is not a scene (no `parameters.scene` in story metadata)
- **THEN** the Visual tab is not shown

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

#### Scenario: Narrow panel
- **WHEN** the addon panel is narrower than 600px
- **THEN** the side-by-side layout stacks vertically (screenshot above, reference below)

### Requirement: Report tab shows visual-compare report

The Report sub-tab SHALL render the `report.md` file as formatted HTML.

#### Scenario: Report available
- **WHEN** `screenshots/{sceneName}/report.md` exists
- **THEN** the report is rendered as HTML (tables, headings, severity badges)

#### Scenario: No report
- **WHEN** no report.md exists
- **THEN** the tab shows empty state: "No visual comparison report yet"

### Requirement: Panel reads scene context from story parameters

The panel SHALL use `parameters.scene.source` from the current story to determine the scenes file path, then derive the screenshot directory from the scene name.

#### Scenario: Design system scene
- **WHEN** story has `parameters.scene.source` pointing to `design-system/design-system.scenes.yml`
- **AND** the story name maps to scene "shell"
- **THEN** the panel looks for screenshots in `design-system/screenshots/shell/`

#### Scenario: Section scene
- **WHEN** story has `parameters.scene.source` pointing to `sections/galerie/galerie.section.scenes.yml`
- **AND** the story name maps to scene "product-detail"
- **THEN** the panel looks for screenshots in `sections/galerie/screenshots/product-detail/`

### Requirement: Images served via /__designbook/load endpoint

All screenshots and references SHALL be loaded via the existing `/__designbook/load?path=` endpoint.

#### Scenario: Screenshot image loaded
- **WHEN** the panel displays a screenshot
- **THEN** the img src is `/__designbook/load?path=sections/galerie/screenshots/product-detail/desktop.png`

### Requirement: DeboSectionPage screenshots tab removed

The section-level Screenshots tab in `DeboSectionPage` SHALL be removed. Visual artifacts are now per-scene in the addon panel.

#### Scenario: Section page without screenshots tab
- **WHEN** the user views a section page
- **THEN** tabs are: Spec, Sample Data, Design (no Screenshots tab)
