## MODIFIED Requirements

### Requirement: Design workflows include inline capture and compare stages

The `design-shell` and `design-screen` workflows SHALL include `capture` and `compare` stages after the `scene` stage and before the `outtake` stage. Both stages reuse existing task files (`capture` and `compare-screenshots`) without modification.

The `capture` stage SHALL iterate over the `checks` iterable (breakpoint × region matrix). The `compare` stage SHALL iterate over the same `checks` iterable.

The `compare-markup` stage SHALL NOT be included in either workflow. Markup comparison is considered redundant with screenshot comparison and is removed from the stage flow.

#### Scenario: design-shell workflow with capture and compare

- **WHEN** the design-shell workflow definition is parsed
- **THEN** the stages are ordered: intake → component → scene → setup-compare → capture → compare → outtake

#### Scenario: design-screen workflow with capture and compare

- **WHEN** the design-screen workflow definition is parsed
- **THEN** the stages are ordered: intake → component → sample-data → entity-mapping → scene → setup-compare → capture → compare → outtake

#### Scenario: compare-markup stage is absent from both workflows

- **WHEN** the design-shell or design-screen workflow definition is parsed
- **THEN** no `compare-markup` stage appears in the stage list

---

### Requirement: Setup-compare step creates story entity, restarts Storybook, and returns checks

A step `design-shell:setup-compare` (and `design-screen:setup-compare`) SHALL:

1. Restart Storybook by running `_debo storybook start --force` before any capture stage begins
2. Create the story entity via `_debo story --scene <scene> --seed <meta-json>`
3. Return the `checks` array as params for the capture and compare stages

The meta-seed JSON SHALL include:
- `reference` entries from the scene params (url, origin, hasMarkup)
- `breakpoints` derived from the workflow's requested breakpoints

The Storybook restart MUST complete before capture stages begin, ensuring Storybook reflects the latest generated components.

#### Scenario: Setup-compare restarts Storybook before capture

- **WHEN** the setup-compare step runs
- **THEN** it executes `_debo storybook start --force` and waits for Storybook to be ready before proceeding to create the story entity

#### Scenario: Setup-compare produces checks for shell scene

- **WHEN** the setup-compare step runs for scene `design-system:shell` with breakpoints `[sm, xl]`
- **THEN** it creates a story entity and returns a `checks` array containing entries for each breakpoint × region combination (e.g., `sm/full`, `sm/header`, `sm/footer`, `xl/full`, `xl/header`, `xl/footer`)

#### Scenario: Setup-compare produces checks for screen scene

- **WHEN** the setup-compare step runs for a section scene with breakpoints `[sm, xl]`
- **THEN** it creates a story entity and returns a `checks` array containing entries for each breakpoint × region combination appropriate to the scene type

---

### Requirement: Intake passes extracted design data as component params

The `design-shell:intake` task SHALL pass extracted design data directly as additional fields on each component param object. This includes styles, fonts, content, and any other relevant data from the design reference extraction. The `create-component` task receives these fields as params without requiring changes to its `params:` declaration.

The intake task MUST identify atomic UI components — including button, badge, icon, and search elements — as discrete components in the params output rather than rendering them as inline HTML within a larger component. The shell container component MUST also be included as a component param.

```json
{
  "component": "header",
  "slots": ["logo", "navigation", "actions"],
  "group": "Shell",
  "description": "ref=header — 2-row header: navy topbar + white nav row",
  "styles": {
    "row1": { "bg": "#00336a", "height": "48px", "padding": "0 1rem" },
    "row2": { "bg": "#ffffff", "height": "64px", "border-bottom": "1px solid #dee2e6" }
  },
  "fonts": { "heading": "Reef 100", "nav": "Sarabun 400" },
  "nav_items": ["Für Ausbildende", "Für Prüfende", "Themen", "Berufe"]
}
```

When no design reference is available, components SHALL be emitted with only the standard fields (component, slots, group).

#### Scenario: Intake identifies atomic UI elements as separate components

- **WHEN** the design-shell intake processes a reference design that contains buttons, badges, and icons
- **THEN** each atomic UI element type (button, badge, icon) is listed as a discrete component param entry, not embedded as inline HTML inside a parent component's template

#### Scenario: Intake includes container as a shell component

- **WHEN** the design-shell intake processes a reference design
- **THEN** the `container` component is included in the component params list under the Shell group

#### Scenario: Intake with design reference produces rich component params

- **WHEN** the design-shell intake extracts a design reference with identifiable landmarks
- **THEN** each component in the params output includes description (with ref= hint), styles, fonts, and content data extracted from the corresponding landmark

#### Scenario: Intake without design reference produces standard params

- **WHEN** the design-shell intake has no design reference URL
- **THEN** components in the params output contain only component, slots, and group fields

---

### Requirement: Outtake displays score and diff table from draft issues

The outtake task (`outtake--design-screen.md`) SHALL read all draft issue JSON files from `designbook/stories/${storyId}/issues/draft/` and compute a weighted score per region.

Score formula: `score = (critical_count × 3) + (major_count × 2) + (minor_count × 1)`

The outtake SHALL display a table with columns: Breakpoint, Region, Score, Diff summary. The total score (sum of all regions) SHALL be displayed below the table.

A total score of 0 means a perfect visual match.

#### Scenario: Outtake with draft issues shows score table

- **WHEN** the outtake runs and draft issue files exist
- **THEN** it displays a table with score and diff per region, plus a total score

#### Scenario: Outtake without draft issues skips score table

- **WHEN** the outtake runs and no draft issue files exist
- **THEN** it skips the score table and proceeds to the user questions

---

### Requirement: Outtake asks for user observations and offers design-verify

After displaying the score table (or immediately if no drafts exist), the outtake SHALL:

1. Ask the user: "Ist dir noch etwas aufgefallen?" and wait for a response
2. Ask the user: "Soll design-verify gestartet werden?"
3. If yes → launch design-verify as a child workflow (existing behavior)
4. If no → archive the workflow

#### Scenario: User declines design-verify

- **WHEN** the outtake shows results and the user answers "no" to starting design-verify
- **THEN** the workflow archives without launching design-verify

#### Scenario: User accepts design-verify

- **WHEN** the outtake shows results and the user answers "yes" to starting design-verify
- **THEN** the outtake launches design-verify as a child workflow with the scene and reference params (no special flags)

---

### Requirement: Design-verify capture auto-skips existing screenshots

Design-verify SHALL run its full stage cycle when launched from the outtake. The existing capture tasks already check whether screenshots are present and auto-skip when they are. Since the inline capture/compare stages already produced the screenshots, design-verify's capture tasks SHALL mark themselves as done immediately without re-capturing.

#### Scenario: Design-verify capture finds existing screenshots

- **WHEN** design-verify runs after inline compare and screenshots already exist at the expected paths
- **THEN** capture tasks mark themselves as done without re-capturing

#### Scenario: Design-verify capture finds no screenshots

- **WHEN** design-verify runs standalone without prior inline compare
- **THEN** capture tasks run normally and capture screenshots

---

### Requirement: Workflow tasks are the issues — no CLI issue layer

The `_debo story issues` CLI commands SHALL be removed from all design-verify task files. Draft JSON files from compare are the sole source of truth for issues. The workflow engine's task tracking replaces issue status management.

- **triage**: SHALL read draft JSONs, consolidate duplicates, and pass the consolidated issues as `issues` params via `workflow done`. SHALL NOT call `_debo story issues --add` or `--close`.
- **polish**: SHALL fix code based on issue params. SHALL NOT call `_debo story issues --update`. The workflow task status (done) represents the issue being resolved.
- **outtake (design-verify)**: SHALL read workflow task statuses to build the result summary. SHALL NOT call `_debo story issues --scene`.

#### Scenario: Triage consolidates draft issues without CLI

- **WHEN** triage reads draft JSON files from the compare stage
- **THEN** it consolidates them and passes the result as `issues` params without calling any `_debo story issues` CLI commands

#### Scenario: Polish resolves an issue without CLI update

- **WHEN** a polish task fixes the code for an issue
- **THEN** it marks the workflow task as done via `workflow done` without calling `_debo story issues --update`

#### Scenario: Design-verify outtake reads task status

- **WHEN** the design-verify outtake builds the result summary
- **THEN** it reads workflow task statuses to determine which issues are resolved, without calling `_debo story issues --scene`
