## ADDED Requirements

### Requirement: Toolbar dropdown for visual comparison
The addon SHALL register a toolbar tool (`types.TOOL`) that renders a dropdown menu for visual comparison. The dropdown SHALL only be visible when the current story has scene parameters (`parameters.scene` is truthy).

#### Scenario: Dropdown visible for scene stories
- **WHEN** user views a story that has `parameters.scene` set
- **THEN** the toolbar shows a "Visual Compare" dropdown button

#### Scenario: Dropdown hidden for non-scene stories
- **WHEN** user views a story without `parameters.scene`
- **THEN** the toolbar does not show the "Visual Compare" dropdown button

### Requirement: Breakpoint listing in dropdown
The dropdown SHALL list all breakpoints for which a reference image exists at `screenshots/{storyId}/reference/{breakpoint}.png`. Breakpoints SHALL be discovered by probing known breakpoint names. If no reference images exist, the dropdown SHALL show an empty state message.

#### Scenario: Breakpoints with references available
- **WHEN** user opens the dropdown and reference images exist for breakpoints sm, md, xl
- **THEN** the dropdown lists sm, md, xl as selectable entries

#### Scenario: No references available
- **WHEN** user opens the dropdown and no reference images exist for the current story
- **THEN** the dropdown shows "No references found"

### Requirement: Viewport switching on breakpoint selection
Selecting a breakpoint in the dropdown SHALL switch the Storybook viewport to the corresponding breakpoint width. The breakpoint widths SHALL be read from the scene's design token configuration or from a predefined mapping.

#### Scenario: Selecting a breakpoint switches viewport
- **WHEN** user selects breakpoint "md" (768px) in the dropdown
- **THEN** the Storybook preview viewport resizes to 768px width

#### Scenario: Deselecting clears viewport override
- **WHEN** user deselects the active breakpoint (or clicks it again to toggle off)
- **THEN** the viewport returns to its previous state and the overlay is removed

### Requirement: Reference overlay in preview
A preview decorator SHALL render the reference screenshot as an overlay on top of the live story when a breakpoint is selected. The overlay image SHALL be fetched via `/__designbook/load?path=screenshots/{storyId}/reference/{breakpoint}.png`. The overlay SHALL be positioned absolutely at `top: 0; left: 0; width: 100%` with `pointer-events: none` so it does not interfere with story interaction.

#### Scenario: Overlay shown when breakpoint selected
- **WHEN** user selects breakpoint "md" in the dropdown
- **THEN** the reference image for "md" is rendered as an overlay on top of the story with the current opacity value

#### Scenario: Overlay hidden when no breakpoint selected
- **WHEN** no breakpoint is selected in the dropdown (compare is off)
- **THEN** no overlay is rendered — the story displays normally

#### Scenario: Reference image not found
- **WHEN** user selects a breakpoint but the reference image returns 404
- **THEN** the overlay is not rendered and no error is shown to the user

### Requirement: Opacity slider
The dropdown SHALL contain an opacity slider with range 0–100% and a default value of 50%. The slider SHALL update the overlay opacity in real time via globals. The slider SHALL only be interactive when a breakpoint is selected.

#### Scenario: Adjusting opacity
- **WHEN** user moves the opacity slider to 80%
- **THEN** the reference overlay opacity updates to 0.8 immediately

#### Scenario: Slider disabled when no breakpoint selected
- **WHEN** no breakpoint is selected
- **THEN** the opacity slider is disabled / non-interactive

### Requirement: Diff badge per breakpoint
Each breakpoint entry in the dropdown SHALL display a diff badge showing the diff percentage and threshold (e.g. "2.1% / 5%"). The badge SHALL be color-coded green for pass (diff ≤ threshold) and red for fail (diff > threshold). Diff data SHALL be parsed from `screenshots/{storyId}/report.md`.

#### Scenario: Passing breakpoint
- **WHEN** breakpoint "md" has a diff of 1.2% with a threshold of 5%
- **THEN** the badge shows "1.2% / 5%" in green

#### Scenario: Failing breakpoint
- **WHEN** breakpoint "xl" has a diff of 6.3% with a threshold of 5%
- **THEN** the badge shows "6.3% / 5%" in red

#### Scenario: No report available
- **WHEN** no report.md exists for the current story
- **THEN** badges show "—" for all breakpoints

### Requirement: Globals schema for visual compare state
The visual compare state SHALL be stored in Storybook globals under the key `designbook:visual-compare`. The value SHALL be an object with `breakpoint` (string or null) and `opacity` (number 0–100, default 50). The toolbar tool writes this state; the preview decorator reads it.

#### Scenario: Initial state
- **WHEN** the addon loads and no compare action has been taken
- **THEN** globals `designbook:visual-compare` is `{ breakpoint: null, opacity: 50 }`

#### Scenario: State after breakpoint selection
- **WHEN** user selects breakpoint "lg" and sets opacity to 70
- **THEN** globals `designbook:visual-compare` is `{ breakpoint: "lg", opacity: 70 }`

## REMOVED Requirements

### Requirement: Visual tab registration
**Reason**: The `types.TAB` approach is deprecated in Storybook 11 and has been replaced by the toolbar overlay approach.
**Migration**: Remove the `TAB_ID` registration from `manager.tsx`. Visual comparison is now handled by the toolbar dropdown + preview decorator.
