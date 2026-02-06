## MODIFIED Requirements

### Requirement: Shared Components Exported via Index
All shared `Debo*` components, workflow-specific display components, and the `useDesignbookData` hook SHALL be exported from `.storybook/source/components/index.js` for clean imports in MDX files.

#### Scenario: Barrel export includes DataModelCard
- **WHEN** an MDX file imports from `.storybook/source/components/index.js`
- **THEN** `DataModelCard` is available alongside existing exports
- **AND** all previously exported components remain available
