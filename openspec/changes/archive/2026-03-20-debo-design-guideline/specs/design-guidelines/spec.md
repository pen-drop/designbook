## ADDED Requirements

### Requirement: debo-design-guideline Workflow
A new `debo-design-guideline` workflow skill SHALL be created. It guides the user through a dialog to capture design decisions and saves them to `$DESIGNBOOK_DIST/design-system/guidelines.yml`.

The workflow task file SHALL declare `design-system/design-tokens.yml` as an optional `reads:` dependency. If the file exists, the workflow reads it for context (e.g. to reference existing token names in component patterns). If missing, the workflow proceeds without it.

The dialog SHALL ask questions in order from non-technical to technical. All output (component names, guidelines content) SHALL always be in English — no language question is asked.

1. **References** — Existing design systems, websites, or styles to orient from (optional, multiple)
2. **Design file** — Design file URL with type (Figma, Sketch, XD, other) and label (optional)
3. **Principles** — General design principles (e.g. accessible, mobile-first) as free text (optional)
4. **Component patterns** — Component usage rules (e.g. "always use the container component") as free text (optional)
5. **Naming** — Component naming convention (default: `kebab-case`) and 2–3 examples (semi-technical)
6. **MCP server** — MCP server name/URL for design tool access (optional, technical)
7. **Skills** — Design skills to auto-load during design-system stages; offer known list: `frontend-design`, `web-design-guidelines` (technical)

#### Scenario: Workflow dialog completes
- **WHEN** the user answers all dialog questions in `debo-design-guideline`
- **THEN** the workflow creates `design-system/guidelines.yml` with all gathered information
- **AND** the workflow validates and archives the task via the workflow CLI

#### Scenario: Optional fields skipped
- **WHEN** the user skips references or principles
- **THEN** those keys are omitted from `guidelines.yml` (not written as empty arrays)

### Requirement: guidelines.yml File Format
The `guidelines.yml` file SHALL be written to `$DESIGNBOOK_DIST/design-system/guidelines.yml`. All keys except `naming.convention` are optional and SHALL be omitted (not written as empty arrays/objects) when not provided. Output is always in English — no `language` key in the file.

```yaml
references:
  - type: figma
    url: https://...
    label: Brand Guidelines
  - type: url
    url: https://...
    label: Reference Design System

design_file:
  type: figma
  url: https://...
  label: Main Design File

principles:
  - "Accessible by default"
  - "Mobile-first"

component_patterns:
  - "Always use the container component as layout wrapper"

naming:
  convention: kebab-case
  examples:
    - hero-section
    - card-teaser

mcp:
  server: figma-mcp
  url: http://localhost:3333

skills:
  - frontend-design
  - web-design-guidelines
```

#### Scenario: Minimal guidelines file
- **WHEN** the user provides only the naming convention
- **THEN** `guidelines.yml` contains only `naming` — all other keys are omitted

#### Scenario: Full guidelines file
- **WHEN** the user provides all fields
- **THEN** `guidelines.yml` contains: `references`, `design_file`, `principles`, `component_patterns`, `naming`, `mcp`, `skills`

#### Scenario: Optional fields skipped
- **WHEN** the user skips references, design file, principles, component patterns, MCP, or skills
- **THEN** those keys are NOT written to `guidelines.yml` (no empty arrays or null values)

### Requirement: Automatic Skill Loading in Design-System Workflows
All design-system workflow task files (`debo-design-tokens`, `debo-design-component`, `debo-design-screen`, `debo-design-shell`) SHALL declare `reads: design-system/guidelines.yml` in their frontmatter. When the file exists, the AI SHALL read `skills:` from `guidelines.yml` and load each listed skill via the Skill tool before executing the stage.

#### Scenario: Guidelines exist — skills loaded
- **WHEN** a design-system stage begins and `design-system/guidelines.yml` exists
- **THEN** the AI reads `skills:` from the file and loads each skill via the Skill tool before proceeding

#### Scenario: Guidelines missing — reads check fails
- **WHEN** a design-system stage begins and `design-system/guidelines.yml` does not exist
- **THEN** the AI stops and informs the user: "Run /debo-design-guideline first"

#### Scenario: Guidelines exist — naming and principles applied
- **WHEN** a design-system stage executes with `guidelines.yml` present
- **THEN** the naming convention and principles from the file are applied as additional constraints throughout the stage
