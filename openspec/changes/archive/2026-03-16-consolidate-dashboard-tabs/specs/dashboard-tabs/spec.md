## ADDED Requirements

### Requirement: DeboTabs component
The system SHALL provide a `DeboTabs` React component that renders a tabbed interface.

#### Scenario: Render tabs
- **WHEN** `DeboTabs` receives a `tabs` array with `[{id, label, render}]`
- **THEN** it SHALL render a tab bar with one button per tab
- **AND** render the active tab's content below

#### Scenario: Default tab
- **WHEN** `defaultTab` prop is provided
- **THEN** that tab SHALL be active on initial render

#### Scenario: Tab switching
- **WHEN** a tab button is clicked
- **THEN** the active content SHALL switch to that tab's `render()` output

### Requirement: Foundation page
The system SHALL provide a `DeboFoundationPage` that combines Vision and Data Model content under tabs.

#### Scenario: Foundation page tabs
- **WHEN** the Foundation page renders
- **THEN** it SHALL show two tabs: "Vision" and "Data Model"
- **AND** Vision tab SHALL render `DeboProductOverview`
- **AND** Data Model tab SHALL render the data model section

### Requirement: Design System page with tabs
The system SHALL refactor `DeboDesignSystemPage` to use tabs instead of vertical stacking.

#### Scenario: Design System tabs
- **WHEN** the Design System page renders
- **THEN** it SHALL show two tabs: "Tokens" and "Shell"
- **AND** Tokens tab SHALL render the design tokens section
- **AND** Shell tab SHALL render the shell design section

## MODIFIED Requirements

### Requirement: Page order
Pages SHALL be ordered: Foundation (1), Design System (2), Sections Overview (3).

## REMOVED Requirements

### Requirement: Standalone Vision page
**Reason**: Merged into Foundation page as a tab.

### Requirement: Standalone Data Model page
**Reason**: Merged into Foundation page as a tab.
