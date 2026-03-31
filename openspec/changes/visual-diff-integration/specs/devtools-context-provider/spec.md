## ADDED Requirements

### Requirement: designbook-devtools provides devtools-context rule

The `designbook-devtools` skill SHALL provide `rules/devtools-context.md` with `when: steps: [screenshot, visual-compare]` that instructs the agent to collect extra context via Chrome DevTools MCP.

#### Scenario: Collect computed styles during screenshot step
- **WHEN** the screenshot task loads the devtools-context rule
- **THEN** the rule instructs: after Playwright screenshot, navigate to the same URL via `navigate_page` and call `evaluate_script` to extract computed styles (colors, fonts, layout, spacing)

#### Scenario: Collect DOM snapshot
- **WHEN** the devtools-context rule is loaded
- **THEN** the rule instructs: call `take_snapshot` to capture DOM structure

#### Scenario: Run accessibility audit
- **WHEN** the devtools-context rule is loaded
- **THEN** the rule instructs: call `lighthouse_audit` with accessibility category

#### Scenario: Collect console errors
- **WHEN** the devtools-context rule is loaded
- **THEN** the rule instructs: call `list_console_messages` after page load

#### Scenario: Computed styles extraction script
- **WHEN** the `evaluate_script` runs
- **THEN** it extracts: layout properties (display, grid, flex, gap, max-width), all unique colors, all unique font families and sizes, and spacing values from the rendered page

### Requirement: designbook-devtools follows addon skill conventions

#### Scenario: Skill directory structure
- **WHEN** the designbook-devtools skill is created
- **THEN** it has:
  ```
  .agents/skills/designbook-devtools/
  ├── SKILL.md
  └── rules/
      └── devtools-context.md
  ```

#### Scenario: SKILL.md metadata
- **WHEN** the SKILL.md is loaded
- **THEN** it has `name: designbook-devtools`, `user-invocable: false`, `disable-model-invocation: true`
