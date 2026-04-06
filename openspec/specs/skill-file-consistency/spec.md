# skill-file-consistency Specification

## Purpose
TBD - created by archiving change designbook-design-screen-research-fixes-2. Update Purpose after archive.
## Requirements
### Requirement: Rule and blueprint examples use real component patterns

Examples in rules and blueprints SHALL NOT use fictional component names. They SHALL use `COMPONENT_NAMESPACE:` variable references or actual component names from the skill's domain.

#### Scenario: Canvas rule examples
- **WHEN** `canvas.md` rule provides component examples
- **THEN** it SHALL NOT use `canvas_section`, `canvas_text`, `canvas_image`, `canvas_cta`
- **THEN** it SHALL use `COMPONENT_NAMESPACE:section`, `COMPONENT_NAMESPACE:hero` or similar real patterns

#### Scenario: Canvas blueprint examples
- **WHEN** `canvas.md` blueprint provides component tree examples
- **THEN** it SHALL use `slots` key (not `children`)
- **THEN** it SHALL use realistic component names following the namespace pattern

### Requirement: Blueprints contain only overridable guidance

Blueprints SHALL NOT contain absolute constraints (RULE, NEVER, MUST NOT). Hard constraints SHALL be in rule files.

#### Scenario: Grid blueprint constraint extraction
- **WHEN** `grid.md` blueprint contains "RULE: Never create domain-specific layout components"
- **THEN** this constraint SHALL be moved to a rule file in `designbook-drupal/components/rules/`
- **THEN** the blueprint SHALL retain only the overridable starting point

#### Scenario: Container blueprint constraint extraction
- **WHEN** `container.md` blueprint contains "No other component should apply its own max-width"
- **THEN** this constraint SHALL be moved to a rule file in `designbook-drupal/components/rules/`
- **THEN** the blueprint SHALL retain only the overridable starting point

### Requirement: No duplicate when.steps entries

Blueprint and rule `when.steps` arrays SHALL NOT contain duplicate step names.

#### Scenario: Section blueprint deduplicated
- **WHEN** `section.md` blueprint declares `when.steps`
- **THEN** `design-shell:intake` SHALL appear exactly once

#### Scenario: Grid blueprint deduplicated
- **WHEN** `grid.md` blueprint declares `when.steps`
- **THEN** `design-shell:intake` SHALL appear exactly once

#### Scenario: Container blueprint deduplicated
- **WHEN** `container.md` blueprint declares `when.steps`
- **THEN** `design-shell:intake` SHALL appear exactly once

### Requirement: Blueprint titles match their type

Data-mapping blueprints SHALL NOT use "Rule:" prefix in their titles.

#### Scenario: Data-mapping blueprint titles
- **WHEN** a blueprint file in `data-mapping/blueprints/` has a title
- **THEN** the title SHALL NOT start with "Rule:"
- **THEN** it SHALL use a descriptive title matching the blueprint pattern (e.g., "Blueprint: Canvas", "Blueprint: Layout Builder")

### Requirement: Link rule example matches description

The `link.md` rule's description and example SHALL be consistent.

#### Scenario: Link rule coherence
- **WHEN** the `link.md` rule describes link format
- **THEN** the description and example SHALL show the same data structure
- **THEN** if the format is an HTML anchor string, the description SHALL say so (not "object with uri and title")

### Requirement: DevTools rule focuses on constraints not procedures

The `devtools-context.md` rule SHALL define WHEN and WHAT to collect, not provide full implementation code.

#### Scenario: DevTools rule simplified
- **WHEN** `devtools-context.md` is loaded as a rule
- **THEN** it SHALL state the constraint: "collect computed styles, DOM snapshot, and accessibility data alongside screenshots"
- **THEN** JavaScript implementation code SHALL be reduced to pseudocode or moved to a reference
- **THEN** when DevTools MCP server is not available, the rule SHALL instruct to show a visible warning to the user (not silently skip)

### Requirement: Tasks declare WHAT not HOW

Task files SHALL contain output declarations and constraints, not implementation instructions.

#### Scenario: create-component.md HOW-guidance removed
- **WHEN** `create-component.md` contains "MANDATORY: Change the app css after a new component is created"
- **THEN** this SHALL be rephrased as an output declaration (e.g., a `files:` entry for app.src.css) or moved to a rule

