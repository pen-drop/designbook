## MODIFIED Requirements

### Requirement: Shared Components Exported via Index
All shared components and workflow-specific display components SHALL be exported from `.storybook/source/components/index.js`.

#### Scenario: Barrel export includes DesignTokensCard
- **WHEN** an MDX file imports from `.storybook/source/components/index.js`
- **THEN** `DesignTokensCard` is available alongside existing exports
