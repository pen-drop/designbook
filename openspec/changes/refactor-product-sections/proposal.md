# Proposal: Refactor Product Sections Workflow

## Why
The current architecture for managing product sections uses the `debo-product-roadmap` workflow to create individual MDX files (`sections/*.mdx`). This manual file creation approach is fragile and doesn't scale well for an addon architecture. Storing section data as structured JSON and having the Storybook addon generate the documentation pages dynamically is a more robust and plugin-friendly approach.

## What Changes
- **Rename Workflow**: Rename `debo-product-roadmap` to `debo-product-sections` to better reflect its purpose.
- **Data Persistence**: Change storage format from multiple MDX files to a single or structured `designbook/sections.json`.
- **Storybook Addon**:
  - Update `storybook-addon-designbook` to index `designbook/sections.json`.
  - Dynamically generate one MDX story per section defined in the JSON.
- **Validation**:
  - Create a JSON schema for product sections at `schema/sections.json`.
  - Validate data against this schema during the workflow.

## Capabilities

### New Capabilities
- `product-sections-workflow`: Logic for the renamed workflow to interview the user and save to JSON.
- `product-sections-schema`: JSON schema definition and validation logic.

### Modified Capabilities
- `storybook-addon-designbook`:
  - **Requirement**: Must dynamically generate stories from `sections.json` instead of relying on static MDX files.
  - **Requirement**: Must define an indexer or loader to handle the new data format.

## Impact
- **Agent Workflows**: `debo-product-roadmap.md` will be moved/renamed.
- **Storybook Addon**: Significant changes to `vite-plugin.ts` or a new indexer to handle dynamic story generation.
- **Data**: Existing MDX files in `designbook/sections/` (if any) should be migrated to `designbook/sections.json`.
