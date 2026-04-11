# stitch-reference-provider Specification

## Purpose
TBD - created by archiving change visual-diff-integration. Update Purpose after archive.
## Requirements
### Requirement: designbook-stitch provides stitch-reference rule

The `designbook-stitch` skill SHALL provide `rules/stitch-reference.md` with `when: steps: [resolve-reference], extensions: stitch` that instructs the agent to resolve stitch:// references via Stitch MCP.

#### Scenario: Resolve single stitch reference
- **WHEN** the resolve-reference task loads the stitch-reference rule
- **AND** the target has `reference: { type: stitch, url: "stitch://project/screen-123" }`
- **THEN** the rule instructs: call `mcp__stitch__get_screen` → fetch `screenshot.downloadUrl` → save to `designbook/screenshots/{storyId}/reference/{breakpoint}.png`

#### Scenario: Resolve per-breakpoint stitch references
- **WHEN** the scene has `reference.screens` with multiple stitch URLs
- **THEN** the rule instructs: resolve each screen separately, one reference image per breakpoint

#### Scenario: Scene has no reference block
- **WHEN** the scene has no `reference`
- **THEN** the rule is loaded but has no work to do — resolve-reference task handles the skip

#### Scenario: Stitch MCP unavailable
- **WHEN** `mcp__stitch__get_screen` returns an error
- **THEN** the agent reports a warning and continues without reference

### Requirement: designbook-stitch provides stitch-intake rule

The `designbook-stitch` skill SHALL provide `rules/stitch-intake.md` with `when: steps: [design-shell:intake, design-screen:intake, design-component:intake], extensions: stitch` that enhances the core reference intake with Stitch-specific screen selection via MCP.

The core intake already asks for references when a design source is configured in the vision. The stitch-intake rule adds MCP-based screen listing so the user can pick from available Stitch screens instead of entering URLs manually.

#### Scenario: Screen selection via MCP during intake
- **WHEN** the core intake asks for a reference
- **AND** the design source type is `stitch`
- **AND** the stitch-intake rule matches
- **THEN** the rule instructs: call `mcp__stitch__list_screens`, present screens to user for selection per breakpoint

#### Scenario: No stitch project configured
- **WHEN** `vision.md` has no `design_reference`
- **THEN** the rule instructs: call `mcp__stitch__list_projects` first, ask user to select

### Requirement: designbook-stitch follows addon skill conventions

#### Scenario: Skill directory structure
- **WHEN** the designbook-stitch skill is created
- **THEN** it has:
  ```
  .agents/skills/designbook-stitch/
  ├── SKILL.md
  └── rules/
      ├── stitch-reference.md
      └── stitch-intake.md
  ```

#### Scenario: SKILL.md metadata
- **WHEN** the SKILL.md is loaded
- **THEN** it has `name: designbook-stitch`, `user-invocable: false`, `disable-model-invocation: true`

