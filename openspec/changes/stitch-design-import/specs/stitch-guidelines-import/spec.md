## ADDED Requirements

### Requirement: stitch-guidelines rule analyzes screen HTML during guidelines intake

The `designbook-stitch` skill SHALL provide `rules/stitch-guidelines.md` with `when: steps: [design-guidelines:intake], design_tool.type: stitch` that fetches Stitch screen HTML and proposes guidelines values.

#### Scenario: Screen HTML available
- **WHEN** the guidelines intake loads the stitch-guidelines rule
- **AND** at least one screen exists in the Stitch project
- **THEN** the rule instructs the agent to:
  1. Call `list_screens` to find screens
  2. Call `get_screen` for the primary screen (or ask user to select)
  3. Fetch HTML from `htmlCode.downloadUrl`
  4. Analyze the HTML for component patterns, layout principles, and visual atmosphere
  5. Propose `principles`, `component_patterns`, and `references` values

#### Scenario: Component patterns extracted from HTML
- **WHEN** the screen HTML contains recurring Tailwind patterns
- **THEN** the rule proposes component_patterns such as:
  - Card styling (roundness, shadow, background)
  - Button styling (shape, color roles)
  - Form input styling (borders, backgrounds)
  - Grid/layout patterns (column counts, gap sizes)

#### Scenario: Layout principles extracted from HTML
- **WHEN** the screen HTML contains layout structure
- **THEN** the rule proposes principles such as:
  - Whitespace strategy (generous/compact)
  - Grid alignment (e.g. "8px grid")
  - Max-width constraints
  - Responsive patterns

#### Scenario: Visual atmosphere description
- **WHEN** the screen HTML and screenshot are analyzed
- **THEN** the rule proposes principles describing the visual atmosphere:
  - Mood (e.g. "Minimalist and airy", "Dense and utilitarian")
  - Shadow/depth strategy (flat, subtle, pronounced)
  - Color density (monochromatic, vibrant, muted)

#### Scenario: User modifies proposed guidelines
- **WHEN** the agent presents Stitch-derived guidelines
- **THEN** the user MAY accept, modify, or reject each value
- **AND** the intake continues normally

#### Scenario: No screens in Stitch project
- **WHEN** the Stitch project has no designed screens
- **THEN** the rule is silently skipped
- **AND** guidelines intake proceeds without Stitch data

#### Scenario: Stitch MCP unavailable
- **WHEN** the MCP calls fail
- **THEN** the rule is silently skipped

### Requirement: Stitch screen stored as design_reference reference

When the stitch-guidelines rule successfully analyzes a screen, it SHALL propose setting the `design_reference` and `mcp` fields in guidelines.yml.

#### Scenario: Design file reference set
- **WHEN** the rule successfully fetches and analyzes a Stitch screen
- **THEN** it proposes:
  ```yaml
  design_reference:
    type: stitch
    url: stitch://project-id/screen-id
    label: "[Screen Title]"
  mcp:
    server: stitch
  ```

### Requirement: design_tool.type from designbook config

The rule's `when` condition SHALL use `design_tool.type: stitch` from the designbook config.

#### Scenario: Stitch configured
- **WHEN** the designbook config has `design_tool.type: stitch`
- **THEN** the stitch-guidelines rule matches for `design-guidelines:intake`
