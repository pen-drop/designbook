## ADDED Requirements

### Requirement: Skill files follow the 4-level type model
Every file in the skill directory structure SHALL be classified as exactly one of: task, rule, blueprint, or resource. Classification determines the directory and auto-loading behavior:

- **Tasks** (`tasks/`): Declare WHAT to produce — `params:`, `result:`, `reads:`, `files:` in frontmatter. Auto-loaded by step matching.
- **Rules** (`rules/`): Hard constraints with `when:` conditions. Auto-loaded by step matching. Must NOT contain procedural instructions.
- **Blueprints** (`blueprints/`): Overridable starting points and examples. Auto-loaded by step matching. Must NOT contain absolute constraints that belong in rules.
- **Resources** (`resources/`): Reference material loaded on-demand by tasks. NOT auto-loaded by the stage resolver.

#### Scenario: Procedural content in a rule is reclassified
- **WHEN** a file in `rules/` contains procedural instructions (command sequences, download strategies, phase-by-phase extraction steps) rather than hard constraints
- **THEN** the file SHALL be moved to `resources/` and its `when:` frontmatter removed

#### Scenario: Non-overridable content in a blueprint is reclassified
- **WHEN** a file in `blueprints/` contains non-overridable procedural instructions (curl commands, CLI sequences) rather than starting-point examples
- **THEN** the file SHALL be moved to `resources/` and its `when:` frontmatter removed

### Requirement: No stale step references in when.steps
All `when.steps` values in rule and blueprint files SHALL reference step names that exist in at least one workflow definition. Stale step names (referencing removed or renamed steps) SHALL be removed.

#### Scenario: Stale recapture step is removed
- **WHEN** a rule declares `when: { steps: ["capture", "recapture", "compare"] }` and no workflow defines a `recapture` step
- **THEN** the `recapture` entry SHALL be removed from `when.steps`

#### Scenario: Bare step name corrected to qualified form
- **WHEN** a rule declares `when: { steps: ["create-scene"] }` but the workflow defines the step as `design-shell:create-scene`
- **THEN** the rule's `when.steps` SHALL be updated to `["design-shell:create-scene", "design-screen:create-scene"]`

### Requirement: Blueprints do not duplicate rule constraints
Blueprint files SHALL NOT repeat hard constraints that are already defined in rule files. When a rule already enforces a constraint (e.g., `{% block %}` wrapping), blueprints SHALL reference the rule by name instead of duplicating the constraint content.

#### Scenario: Blueprint references rule instead of duplicating
- **WHEN** a blueprint for a layout component (container, grid, section) needs to mention the `{% block %}` wrapping requirement
- **THEN** the blueprint SHALL contain a single-sentence reference to `sdc-conventions.md` instead of a full code block duplicating the constraint

### Requirement: extract-reference is a resource not a rule
The `extract-reference.md` file SHALL be located at `designbook/design/resources/extract-reference.md` (not `rules/`). It contains procedural Playwright instructions for extracting design data from reference URLs. Tasks that need this content SHALL reference it explicitly.

#### Scenario: extract-reference is not auto-loaded
- **WHEN** the stage resolver runs for the `intake` step
- **THEN** `extract-reference.md` is NOT in the auto-loaded rules list because it is in `resources/`, not `rules/`

### Requirement: static-assets is a resource not a blueprint
The `static-assets.md` file SHALL be located at `designbook/design/resources/static-assets.md` (not `blueprints/`). It contains procedural download instructions for static assets. Tasks that need this content SHALL reference it explicitly. All Playwright command references SHALL use the correct CLI syntax.

#### Scenario: static-assets is not auto-loaded as blueprint
- **WHEN** the stage resolver runs for any step
- **THEN** `static-assets.md` is NOT in the auto-loaded blueprints list because it is in `resources/`, not `blueprints/`
