# reference-extraction

Provider-agnostic reference extraction invoked per-intake with a specific URL and focus. Adapts strategy based on provider capabilities (Playwright for markup sources, MCP API for design tools, AI vision for images). Produces structured JSON with DOM structure, computed styles, navigation, and content patterns — scoped to what the calling intake needs.

## ADDED Requirements

### Requirement: Extraction rule triggers during intake steps

The extraction rule SHALL activate during design intake steps when a reference URL is available. It is a context rule (not a task) that provides structured reference data to the intake task.

#### Scenario: Rule activation with reference URL
- **WHEN** an intake step runs (tokens:intake, design-shell:intake, design-screen:intake)
- **AND** a reference URL has been resolved (via provider rule or user input)
- **THEN** the extraction rule activates and produces structured JSON before the intake task proceeds to design decisions

#### Scenario: Rule skipped without reference URL
- **WHEN** an intake step runs
- **AND** no reference URL is available (user skipped or no provider configured)
- **THEN** the extraction rule does not activate
- **AND** the intake task proceeds with its existing fallback behavior (vision.md, user input)

#### Scenario: Rule frontmatter
- **WHEN** the rule file is loaded
- **THEN** its frontmatter SHALL declare:
  ```yaml
  when:
    steps: [tokens:intake, design-shell:intake, design-screen:intake]
  provides: reference.extraction
  ```

### Requirement: Three focus modes scope extraction

The extraction rule SHALL accept a `focus` parameter that determines which elements and CSS properties to extract.

#### Scenario: Styles focus for tokens intake
- **WHEN** `focus` is `styles`
- **THEN** the extraction SHALL target:
  - `body` element (base font, background color)
  - All heading levels (`h1`–`h6`) present on the page
  - Links (`a`) and buttons (`button`, `[role="button"]`)
  - Primary containers and sections
- **AND** extract these CSS properties: `color`, `backgroundColor`, `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `textTransform`, `borderRadius`, `padding`, `margin`, `gap`
- **AND** the output SHALL group extracted colors and fonts for direct consumption by token discovery

#### Scenario: Structure focus for design-shell intake
- **WHEN** `focus` is `structure`
- **THEN** the extraction SHALL target:
  - Landmark elements: `header`, `nav`, `main`, `footer`, `[role="banner"]`, `[role="navigation"]`, `[role="contentinfo"]`
  - Logo and branding elements within header
  - Navigation items (labels and links)
  - Footer sections (link groups, legal, social)
- **AND** extract these CSS properties: `display`, `flexDirection`, `gap`, `alignItems`, `justifyContent`, `backgroundColor`, `height`, `maxWidth`, `padding`, `gridTemplateColumns`
- **AND** extract content: navigation link labels, footer link labels, logo alt text
- **AND** include `children` arrays to capture the component hierarchy within each landmark

#### Scenario: Content focus for design-screen intake
- **WHEN** `focus` is `content`
- **THEN** the extraction SHALL target:
  - The `main` or primary content area
  - Sections, grids, and card containers within content
  - Hero/banner areas
  - List and teaser patterns
  - Media elements within content sections
- **AND** extract these CSS properties: `display`, `gridTemplateColumns`, `gap`, `padding`, `maxWidth`, `aspectRatio`, `objectFit`
- **AND** extract content: section headings, card structures, image counts
- **AND** include `children` arrays to capture content patterns and component boundaries

### Requirement: Provider-agnostic strategy selection

The extraction rule SHALL select its extraction strategy based on provider capabilities, not provider identity.

#### Scenario: Playwright extraction for markup sources
- **WHEN** the reference source has `hasMarkup: true`
- **THEN** the extraction SHALL use the Playwright two-phase approach:
  1. AI inspects the page (screenshot + DOM summary) and generates an extraction spec YAML
  2. Playwright executes the spec mechanically and writes structured JSON
- **AND** the Playwright session SHALL follow the constraints in `playwright-capture.md` (viewport 1600px height, waitForTimeout 3000ms)

#### Scenario: API extraction for design tool sources (future)
- **WHEN** the reference source has `hasMarkup: false` AND `hasAPI: true`
- **THEN** the extraction SHALL use the provider's MCP API to retrieve nodes and styles
- **AND** map the API response to the same JSON output format as Playwright extraction

#### Scenario: Vision fallback for image-only sources
- **WHEN** the reference source has `hasMarkup: false` AND `hasAPI: false`
- **THEN** the extraction SHALL use AI vision analysis of the reference screenshot
- **AND** produce the same JSON output format with AI-estimated values (marked as `"source": "vision"`)

#### Scenario: Strategy priority
- **WHEN** multiple strategies are available (e.g., hasMarkup AND hasAPI)
- **THEN** Playwright extraction SHALL take priority over API extraction
- **AND** API extraction SHALL take priority over vision fallback

### Requirement: Extraction output format

The extraction SHALL produce a structured JSON file following the established extraction-reference.json schema from compare-markup, extended with `children` and `focus` fields.

#### Scenario: Output file location
- **WHEN** extraction completes
- **THEN** the JSON SHALL be written to `$DESIGNBOOK_DATA/design-system/extractions/{focus}--{url-hash}.json`
- **AND** `{url-hash}` SHALL be a short hash (first 8 chars of SHA-256) of the reference URL

#### Scenario: Output JSON structure
- **WHEN** extraction produces output
- **THEN** the JSON SHALL contain:
  ```json
  {
    "url": "<reference-url>",
    "viewport": { "width": 1440, "height": 1600 },
    "focus": "<styles|structure|content>",
    "strategy": "<playwright|api|vision>",
    "elements": [
      {
        "label": "<human-readable-name>",
        "selector": "<css-selector>",
        "category": "<typography|layout|interactive|media|decoration>",
        "matches": 1,
        "styles": { "<property>": "<value>" },
        "content": { "links": [], "text": "", "images": [] },
        "children": []
      }
    ]
  }
  ```
- **AND** the `children` array SHALL use the same element structure recursively (max depth 3)
- **AND** `content` and `children` fields are optional (included only when relevant to the focus mode)

#### Scenario: Same-focus reuse within a workflow run
- **WHEN** the same URL + focus combination is requested again within one workflow run
- **AND** the extraction JSON already exists at the expected path
- **THEN** the rule MAY skip re-extraction and read the existing JSON

### Requirement: Extraction spec YAML reuses compare-markup format

The AI-generated extraction spec SHALL use the same YAML format as compare-markup's Phase 1 output.

#### Scenario: Extraction spec format
- **WHEN** the AI generates an extraction spec for Playwright execution
- **THEN** the spec SHALL contain:
  ```yaml
  elements:
    - selector: "<css-selector>"
      label: "<human-readable-name>"
      category: "<typography|layout|interactive|media|decoration>"
      extract: [<css-property-names>]
      content_check: true|false
      match_children: true|false
  ```
- **AND** the `extract` property list SHALL be scoped by the focus mode (styles extracts color/font properties, structure extracts layout properties, content extracts layout/media properties)

#### Scenario: Extraction spec persistence
- **WHEN** the extraction spec is generated
- **THEN** it SHALL be written to `$DESIGNBOOK_DATA/design-system/extractions/{focus}--{url-hash}--spec.yml`
- **AND** it MAY be inspected by the user for debugging

### Requirement: Intake tasks consume extraction JSON

Each intake task SHALL read the extraction JSON when available and use it to inform design decisions instead of guessing.

#### Scenario: tokens intake uses styles extraction
- **WHEN** `tokens:intake` runs with a styles extraction available
- **THEN** Step 2 (Choose Colors) SHALL present extracted color values as the starting palette
- **AND** Step 3 (Choose Typography) SHALL present extracted font families and size scale as defaults
- **AND** the user MAY override any extracted value

#### Scenario: design-shell intake uses structure extraction
- **WHEN** `design-shell:intake` runs with a structure extraction available
- **THEN** Step 2 (Analyze Layout) SHALL derive the layout pattern from extracted landmark structure
- **AND** Step 3 (Plan Components) SHALL derive the component list from extracted DOM hierarchy
- **AND** Step 4 (Gather Shell Details) SHALL pre-fill navigation items, footer links from extracted content

#### Scenario: design-screen intake uses content extraction
- **WHEN** `design-screen:intake` runs with a content extraction available
- **THEN** Step 3 (Determine Screens) SHALL use extracted content patterns to inform screen suggestions
- **AND** Step 5 (Plan Components) SHALL derive components from extracted content structure

#### Scenario: Intake proceeds without extraction
- **WHEN** no extraction JSON is available (no reference URL, or extraction failed)
- **THEN** the intake task SHALL proceed with its existing behavior (ask user, suggest from vision.md)
- **AND** no error SHALL be raised

### Requirement: Provider interface extension

The provider rule interface SHALL support an optional `hasAPI` field alongside the existing `hasMarkup` field.

#### Scenario: Provider rule with hasAPI
- **WHEN** a provider rule resolves a reference source
- **THEN** it MAY set `reference.hasAPI: true` to indicate an MCP API is available
- **AND** if `hasAPI` is not set, it SHALL default to `false`

#### Scenario: Existing provider rules unchanged
- **WHEN** `provide-stitch-url.md` resolves a Stitch reference
- **THEN** it SHALL continue to set `hasMarkup: true` (Stitch serves HTML)
- **AND** it MAY additionally set `hasAPI: true` (Stitch has MCP API)
- **AND** since `hasMarkup` takes priority, the extraction strategy remains Playwright
