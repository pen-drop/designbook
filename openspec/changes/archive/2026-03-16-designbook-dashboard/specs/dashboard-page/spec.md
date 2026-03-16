## ADDED Requirements

### Requirement: Dashboard page registered in Storybook manager
The addon SHALL register a Storybook page replacing the current Export page. The page SHALL be accessible from the Storybook sidebar under "Designbook".

#### Scenario: Page visible in sidebar
- **WHEN** Storybook is running with the Designbook addon
- **THEN** a "Designbook" entry appears in the sidebar linking to the dashboard page

### Requirement: Dashboard displays Recent Activity strip
The dashboard SHALL display a compact "Recent Activity" strip at the top showing the last 5 workflow entries using `DeboActionList`. Active workflows SHALL show `in-progress` status, archived workflows SHALL show `done` status, with title and relative time.

#### Scenario: Recent activity with mixed workflows
- **WHEN** the dashboard loads and there are active and archived workflows
- **THEN** the Recent Activity strip shows the 5 most recent entries sorted by time

#### Scenario: No workflow activity
- **WHEN** no workflows exist
- **THEN** the Recent Activity strip shows "No workflow activity yet"

### Requirement: StatusBox displays area overview as badge row
Each area (Design System, Data Model, Shell, Section) SHALL be rendered as a `DeboStatusBox` containing a horizontal row of `DeboBadge` elements. Each badge SHALL use `color="green"` when the file exists (with count) or `color="gray"` when missing.

#### Scenario: All files present
- **WHEN** a section has scenes (3), data (19 records), and 4 view-modes
- **THEN** the StatusBox shows three green badges: "scenes (3)", "data (19)", "4 views"

#### Scenario: Some files missing
- **WHEN** a section has scenes but no data and 0 view-modes
- **THEN** the StatusBox shows one green badge "scenes" and two gray badges "data" and "views"

### Requirement: StatusBox shows filtered workflow logs
Each StatusBox SHALL contain a workflow log section below the badges showing `DeboActionList.Item` entries filtered to that area. Logs SHALL only appear if workflows exist for the area.

#### Scenario: Area with workflow history
- **WHEN** the Design System area has an archived `debo-design-tokens` workflow
- **THEN** the StatusBox shows a log entry with status `done`, title, and timestamp

#### Scenario: Area with no workflows
- **WHEN** the Data Model area has no workflow history
- **THEN** the StatusBox shows only the badge row, no log section

### Requirement: StatusBox for missing files shows hint
When a badge indicates a missing file (`color="gray"`), the StatusBox SHALL display a hint below the badges with the command to create it.

#### Scenario: Missing data with hint
- **WHEN** section "figurenkatalog" has no data.yml
- **THEN** a hint appears: "Run /debo-sample-data figurenkatalog"

### Requirement: Dashboard displays Design System StatusBox
The dashboard SHALL display a StatusBox for "Design System" with badges for: `design-tokens.yml`.

#### Scenario: Design tokens exist
- **WHEN** `design-system/design-tokens.yml` exists
- **THEN** the badge shows green "tokens"

#### Scenario: Design tokens missing
- **WHEN** the file does not exist
- **THEN** the badge shows gray "tokens" with hint "Run /debo-design-tokens"

### Requirement: Dashboard displays Data Model StatusBox
The dashboard SHALL display a StatusBox for "Data Model" with a badge for `data-model.yml`.

#### Scenario: Data model exists
- **WHEN** `data-model.yml` exists
- **THEN** the badge shows green "data-model"

### Requirement: Dashboard displays Shell StatusBox
The dashboard SHALL display a StatusBox for "Shell" with a badge for `spec.shell.scenes.yml` including scene count.

#### Scenario: Shell with scenes
- **WHEN** `shell/spec.shell.scenes.yml` exists with 2 scenes
- **THEN** the badge shows green "shell (2 scenes)"

### Requirement: Dashboard discovers sections dynamically
The dashboard SHALL scan `$DESIGNBOOK_DIST/sections/` and display one StatusBox per section directory. The title SHALL be read from the scenes file metadata with fallback to the directory name.

#### Scenario: Multiple sections discovered
- **WHEN** sections directory contains "episodenguide" and "figurenkatalog"
- **THEN** the dashboard shows two section StatusBoxes with their titles

#### Scenario: No sections
- **WHEN** the sections directory is empty
- **THEN** the dashboard shows "No sections yet. Run /debo-sections to define your sections."

### Requirement: Section StatusBox shows scenes, data, and view-mode badges
Each section StatusBox SHALL display badges for: scenes file (with scene count), data.yml (with record count), and view-modes (with file count).

#### Scenario: Section fully configured
- **WHEN** section has 3 scenes, 19 data records, 4 view-modes
- **THEN** badges show green "scenes (3)", green "data (19)", green "4 views"

### Requirement: DeboBadge supports gray color variant
`DeboBadge` SHALL support a `color="gray"` variant for indicating missing/pending status with muted visual styling.

#### Scenario: Gray badge rendered
- **WHEN** a badge is rendered with `color="gray"`
- **THEN** it displays with a muted gray background and text color

### Requirement: Dashboard polls for updates
The dashboard SHALL poll `/__designbook/status` every 3 seconds while the page is active. Polling SHALL stop when the user navigates away.

#### Scenario: Status update detected
- **WHEN** a file is created while the dashboard is open
- **THEN** within 3 seconds the corresponding badge changes from gray to green

### Requirement: Panel becomes empty placeholder
The Panel SHALL render only "Scene Inspector — coming soon" with no polling or state.

#### Scenario: Panel displays placeholder
- **WHEN** the user opens the Designbook panel
- **THEN** it shows "Scene Inspector — coming soon"
