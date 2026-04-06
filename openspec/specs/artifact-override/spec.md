## ADDED Requirements

### Requirement: Artifacts can override other artifacts via as

Any artifact (task, rule, blueprint) SHALL support an optional `as` field that names another artifact to override.

#### Scenario: Task overrides another task
- **WHEN** `screenshot-stitch.md` declares `as: designbook:design:screenshot-reference` with `priority: 30`
- **AND** `screenshot-reference.md` has `priority: 20`
- **AND** both match the current step's `when` conditions
- **THEN** only `screenshot-stitch` runs; `screenshot-reference` is excluded

#### Scenario: Lower priority does not override
- **WHEN** `screenshot-stitch.md` declares `as: designbook:design:screenshot-reference` with `priority: 10`
- **AND** `screenshot-reference.md` has `priority: 20`
- **THEN** only `screenshot-reference` runs; `screenshot-stitch` is excluded

#### Scenario: Rule overrides another rule
- **WHEN** `custom-browser.md` rule declares `as: designbook:design:playwright-session` with `priority: 20`
- **AND** `playwright-session.md` rule has `priority: 0`
- **THEN** only `custom-browser` rule is loaded; `playwright-session` is excluded

#### Scenario: Override target does not match
- **WHEN** a task declares `as: designbook:design:screenshot-reference`
- **AND** `screenshot-reference` does not match the current step (its `when` conditions are not met)
- **THEN** the overriding task runs as a standalone additive task
- **AND** no warning is emitted (the target simply isn't present)

### Requirement: Artifacts without as are additive

Artifacts that do not declare `as` SHALL always run when their `when` conditions match, regardless of other artifacts.

#### Scenario: Multiple additive tasks in same step
- **WHEN** `inspect-storybook.md` (no `as`, priority 10), `inspect-reference.md` (no `as`, priority 20), and `inspect-stitch.md` (no `as`, priority 30) all match step `inspect`
- **THEN** all three tasks run in priority order: 10, 20, 30

#### Scenario: Additive task alongside override
- **WHEN** `ensure-storybook.md` (no `as`, priority 5) and `screenshot-stitch.md` (`as: screenshot-reference`, priority 30) both match step `screenshot`
- **THEN** `ensure-storybook` runs (additive)
- **AND** `screenshot-stitch` replaces `screenshot-reference` (override)

### Requirement: Priority determines execution order and override winner

Artifacts SHALL declare an optional `priority` field (integer, default 0). Higher values indicate later execution and stronger override.

#### Scenario: Priority ordering within a step
- **WHEN** three tasks match a step with priorities 5, 10, 30
- **THEN** they execute in order: 5, 10, 30

#### Scenario: Default priority is zero
- **WHEN** a task does not declare `priority`
- **THEN** its priority is 0

#### Scenario: Equal priority override
- **WHEN** two tasks target the same `as` name with equal priority
- **THEN** the task from the skill that sorts last alphabetically wins (deterministic tiebreak)

### Requirement: CLI warns on as targeting unknown name

The CLI SHALL emit a warning when `as` references a name that no other artifact provides in the current resolution context.

#### Scenario: as targets non-existent artifact
- **WHEN** a task declares `as: designbook:design:nonexistent`
- **AND** no artifact with name `designbook:design:nonexistent` exists or matches
- **THEN** the CLI emits a warning: "as target 'designbook:design:nonexistent' not found — task runs as additive"
- **AND** the task runs normally (additive fallback)
