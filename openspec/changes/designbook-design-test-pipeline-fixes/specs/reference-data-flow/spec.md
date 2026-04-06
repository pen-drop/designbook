## ADDED Requirements

### Requirement: Intake resolve-design-reference partial outputs reference as workflow param

The `resolve-design-reference.md` partial SHALL explicitly instruct the calling intake to include the resolved `reference` array in the workflow params output.

#### Scenario: Reference resolved during intake flows to params
- **WHEN** the resolve-design-reference partial resolves one or more reference entries
- **THEN** the partial instructs the calling intake to include `reference: [...]` in the `--params` JSON passed to `workflow done --task intake`
- **AND** the reference array becomes available to all subsequent tasks as `{{ reference }}`

#### Scenario: No reference resolved
- **WHEN** the user declines a reference or no design_reference is configured
- **THEN** the partial returns `reference: null`
- **AND** the calling intake omits `reference` from params or passes `reference: null`

### Requirement: create-scene tasks declare reference as optional param

The `create-scene--design-shell.md` and `create-scene--design-screen.md` tasks SHALL declare `reference` as an optional param and include it in the scene YAML output when present.

#### Scenario: Scene written with reference entries
- **WHEN** the create-scene task receives a non-null `reference` param
- **THEN** the scene YAML includes the `reference:` array under the scene entry
- **AND** each entry preserves `type`, `url`, `breakpoint`, `threshold`, and `title` fields

#### Scenario: Scene written without reference
- **WHEN** the create-scene task receives no `reference` param or `reference: null`
- **THEN** the scene YAML omits the `reference:` key entirely

### Requirement: Downstream test steps consume scene references

The `screenshot`, `resolve-reference`, and `visual-compare` steps SHALL read the scene's `reference` array from the `*.scenes.yml` file to determine which breakpoints to process.

#### Scenario: Screenshot captures only referenced breakpoints
- **WHEN** the screenshot step reads a scene with a `reference` array containing entries for `sm` and `xl`
- **THEN** it captures screenshots at `sm` and `xl` viewport widths plus the default viewport
- **AND** does not capture screenshots at breakpoints without reference entries

#### Scenario: Resolve-reference resolves each reference entry by type
- **WHEN** the resolve-reference step reads a scene with a `reference` array
- **THEN** it resolves each entry according to its `type` (url, image, stitch, etc.)
- **AND** saves reference screenshots to `designbook/screenshots/${storyId}/reference/${breakpoint}.png`

#### Scenario: No reference array skips test steps gracefully
- **WHEN** a scene has no `reference` array
- **THEN** the screenshot step skips breakpoint-specific captures (only takes default)
- **AND** the resolve-reference step skips with "No reference — skipping."
- **AND** visual-compare runs in token-compliance-only mode
