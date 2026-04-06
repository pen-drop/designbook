## ADDED Requirements

### Requirement: Artifacts have namespaced names

Every task, rule, and blueprint frontmatter SHALL support an optional `name` field following the convention `<skill>:<concern>:<artifact>`.

#### Scenario: Task with explicit name
- **WHEN** a task file at `.agents/skills/designbook/design/tasks/screenshot-reference.md` declares `name: designbook:design:screenshot-reference`
- **THEN** the CLI uses `designbook:design:screenshot-reference` as the artifact's identity for override resolution

#### Scenario: Task without explicit name
- **WHEN** a task file at `.agents/skills/designbook/design/tasks/screenshot-reference.md` has no `name` field
- **THEN** the CLI derives the name as `designbook:design:screenshot-reference` from the filesystem path (`<skill>:<concern>:<filename-without-ext>`)

#### Scenario: Rule with explicit name
- **WHEN** a rule file declares `name: designbook:design:playwright-session`
- **THEN** the CLI uses this name for override resolution via `as`

#### Scenario: Blueprint backward compatibility
- **WHEN** a blueprint declares `type: component` and `name: section` without an explicit namespaced `name`
- **THEN** the CLI derives the identity as `<skill>:blueprints:component/section`
- **AND** the existing `type+name` deduplication continues to work unchanged

### Requirement: Short-name resolution within the same skill

Artifacts SHALL reference other artifacts within the same skill using short names (omitting the skill prefix).

#### Scenario: Short name in as field within same skill
- **WHEN** a task in `designbook` declares `as: design:screenshot-reference`
- **THEN** the CLI resolves this to `designbook:design:screenshot-reference`

#### Scenario: Full name required across skills
- **WHEN** a task in `designbook-stitch` declares `as: design:screenshot-reference`
- **THEN** the CLI resolves this to `designbook-stitch:design:screenshot-reference` (own skill)
- **AND** to override a `designbook` artifact, the full name `designbook:design:screenshot-reference` MUST be used

### Requirement: Flat skill structure omits concern segment

Skills without concern subdirectories SHALL use a two-segment name `<skill>:<artifact>`.

#### Scenario: Flat skill task name
- **WHEN** a task file exists at `.agents/skills/designbook-stitch/tasks/stitch-inspect.md`
- **THEN** the derived name is `designbook-stitch:stitch-inspect`

#### Scenario: Nested skill task name
- **WHEN** a task file exists at `.agents/skills/designbook/design/tasks/compare.md`
- **THEN** the derived name is `designbook:design:compare`
