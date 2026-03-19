## ADDED Requirements

### Requirement: Design-System Workflows Declare Guidelines Dependency
All design-system workflow task files SHALL declare `reads: design-system/guidelines.yml` as a required dependency in their frontmatter. This applies to task files for: `debo-design-tokens`, `debo-design-component`, `debo-design-screen`, and `debo-design-shell`.

```markdown
---
reads:
  - path: $DESIGNBOOK_DIST/design-system/guidelines.yml
    optional: false
params:
  ...
---
```

The AI SHALL apply naming conventions and principles from `guidelines.yml` as implicit constraints throughout the stage — without mentioning them explicitly to the user.

#### Scenario: Design stage blocked without guidelines
- **WHEN** any design-system stage starts and `design-system/guidelines.yml` is missing
- **THEN** the AI stops immediately and tells the user: "❌ `guidelines.yml` not found. Run /debo-design-guideline first."

#### Scenario: Naming convention applied silently
- **WHEN** `guidelines.yml` specifies `naming.convention: kebab-case`
- **THEN** all component names created during the stage SHALL follow kebab-case without the AI announcing this constraint

#### Scenario: Principles applied silently
- **WHEN** `guidelines.yml` contains principles
- **THEN** the principles are applied as hard constraints throughout the stage execution
