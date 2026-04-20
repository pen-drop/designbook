## ADDED Requirements

### Requirement: Storybook URL obtained via `_debo storybook status`

All tasks and resources that access the Storybook instance SHALL obtain the URL by calling `_debo storybook status` and extracting the `url` field from the JSON response. Tasks SHALL NOT use `$DESIGNBOOK_URL` from config as the primary URL source.

If `storybook status` returns `{ "running": false }`, the task SHALL start Storybook first via `_debo storybook start` and then re-check status for the URL.

#### Scenario: Task obtains URL from running Storybook
- **WHEN** a task needs the Storybook URL and `_debo storybook status` returns `{ "running": true, "url": "http://localhost:34757" }`
- **THEN** the task uses `http://localhost:34757` for all Storybook access

#### Scenario: Task starts Storybook when not running
- **WHEN** a task needs the Storybook URL and `_debo storybook status` returns `{ "running": false }`
- **THEN** the task runs `_debo storybook start`, then re-runs `_debo storybook status` to get the URL

#### Scenario: Task does not use $DESIGNBOOK_URL directly
- **WHEN** a task needs the Storybook URL
- **THEN** the task calls `_debo storybook status` instead of reading `$DESIGNBOOK_URL` from config

### Requirement: Scene creation receives design reference data

The `create-scene--design-shell` task SHALL have access to the design reference extracted during intake. The task's `reads:` declaration SHALL include `$STORY_DIR/design-reference.md` so reference URLs and extracted data are available for setting the `reference:` field on the shell scene.

#### Scenario: Scene task reads design reference
- **WHEN** the `create-scene--design-shell` task runs and `$STORY_DIR/design-reference.md` exists
- **THEN** the task reads the design reference file and uses its `Source:` URL to populate the scene's `reference:` array

#### Scenario: Scene task works without design reference
- **WHEN** the `create-scene--design-shell` task runs and no `design-reference.md` exists
- **THEN** the task creates the scene without a `reference:` array (the read is optional)

## MODIFIED Requirements

### Requirement: Intake passes extracted design data as component params

The `design-shell:intake` task SHALL pass extracted design data directly as additional fields on each component param object. This includes styles, fonts, content, and any other relevant data from the design reference extraction. The `create-component` task receives these fields as params without requiring changes to its `params:` declaration.

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

The intake task SHALL also resolve embed dependencies from loaded blueprints (see `blueprint-embed-deps` spec) and sort the component list by dependency order before emitting.

#### Scenario: Intake with design reference produces rich component params
- **WHEN** the design-shell intake extracts a design reference with identifiable landmarks
- **THEN** each component in the params output includes description (with ref= hint), styles, fonts, and content data extracted from the corresponding landmark

#### Scenario: Intake without design reference produces standard params
- **WHEN** the design-shell intake has no design reference URL
- **THEN** components in the params output contain only component, slots, and group fields

#### Scenario: Intake resolves embed dependencies and sorts build order
- **WHEN** the intake proposes components and loaded blueprints have `embeds:` fields
- **THEN** the final component list includes all embedded dependencies and is sorted so embedded components come before embedders
