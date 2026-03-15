## ADDED Requirements

### Requirement: Onboarding guide displays project status badges
The addon SHALL render a compact onboarding guide block that displays badge-style status indicators for key project milestones: vision, tokens, data-model, shell, and sections. Each badge SHALL be green when the artifact exists and gray when missing. The sections badge SHALL show a summary count (e.g. `sections (2/4)`).

#### Scenario: All milestones complete
- **WHEN** vision.md, design-tokens.yml, data-model.yml, design-system.scenes.yml all exist and all sections are ready
- **THEN** five green badges are shown: "vision", "tokens", "data-model", "shell", "sections (4/4)"

#### Scenario: Some milestones missing
- **WHEN** vision.md exists but design-tokens.yml does not exist
- **THEN** "vision" badge is green and "tokens" badge is gray

#### Scenario: No milestones complete
- **WHEN** none of the milestone files exist
- **THEN** all five badges are gray

### Requirement: Sections badge shows summary count with tri-state color
The sections badge SHALL display a count of ready sections vs total sections (e.g. `sections (2/4)`). The badge color SHALL be green when all sections are ready, yellow when some sections are ready, and gray when no sections exist.

#### Scenario: All sections ready
- **WHEN** 4 sections exist and all 4 have scenes
- **THEN** sections badge shows "sections (4/4)" in green

#### Scenario: Some sections ready
- **WHEN** 4 sections exist and 2 have scenes
- **THEN** sections badge shows "sections (2/4)" in yellow

#### Scenario: No sections
- **WHEN** no sections exist
- **THEN** sections badge shows "sections" in gray

### Requirement: Onboarding guide displays collapsible detail area
The addon SHALL include a collapsible detail area below the status badges. When expanded, it SHALL show per-section badges and a recent activity log. The area SHALL be collapsed by default.

#### Scenario: Detail area with sections and activity
- **WHEN** sections and workflows exist
- **THEN** the detail area shows per-section badges (each with name and ready/not-ready state) and workflow titles with relative timestamps
- **AND** the area is collapsed by default

#### Scenario: Detail area with no sections
- **WHEN** no sections exist but workflows exist
- **THEN** the detail area shows only the activity log

#### Scenario: Detail area empty
- **WHEN** no sections and no workflow activity exist
- **THEN** the detail area shows "No activity yet"

### Requirement: Onboarding guide is always visible
The onboarding guide SHALL be rendered in a location that is visible regardless of which Storybook page or story the user is viewing. It SHALL NOT be a separate page that requires navigation.

#### Scenario: Visible while browsing stories
- **WHEN** the user is viewing any story in Storybook
- **THEN** the onboarding guide block is visible

#### Scenario: Visible on built-in pages
- **WHEN** the user navigates to any Designbook page (Vision, Design System, etc.)
- **THEN** the onboarding guide block is visible

### Requirement: Onboarding guide polls status endpoint
The onboarding guide SHALL poll `/__designbook/status` at a regular interval to keep badges and activity log current. The poll interval SHALL be 3-5 seconds.

#### Scenario: Status updates after workflow completes
- **WHEN** a workflow creates vision.md (previously missing)
- **THEN** within one poll interval, the "vision" badge changes from gray to green
