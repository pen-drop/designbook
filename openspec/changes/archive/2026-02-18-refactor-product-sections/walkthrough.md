# Walkthrough: Refactor Product Sections Workflow

I have refactored the product sections workflow to be data-driven and dynamic.

## Changes

### 1. Workflow Renamed and Updated
- Renamed `.agent/workflows/debo-product-roadmap.md` to `.agent/workflows/debo-product-sections.md`.
- Updated the workflow to guide users to create/update product sections stored in `designbook/sections.json` instead of individual files.
- Added `schema/sections.json` to enforce data structure.

### 2. JSON-Driven Persistence
- Product sections are now stored in `designbook/sections.json`.
- Each section has an `id`, `title`, `description`, `status`, and `order`.

### 3. Storybook Indexer
- Implemented a custom indexer in `packages/storybook-addon-designbook/src/indexer.ts` that reads `sections.json`.
- Configured `packages/storybook-addon-designbook/src/vite-plugin.ts` to dynamically generate MDX documentation for each section using the `src/onboarding/section.mdx` template.
- Integration tests updated to include `sections.json` in Storybook configuration.

## Verification

### Automated Verification
- **Build Success**: `packages/storybook-addon-designbook` builds successfully with the new indexer and template copying logic.
- **Integration Configuration**: `test-integration-drupal` uses the updated addon logic.

### Manual Verification Steps
1. Run local Storybook for `test-integration-drupal`.
2. check the terminal output for logs starting with `[Designbook]`. You should see `Attempting to load section from id: ...` and `Found section: ...`.
3. Ensure `designbook/sections.json` exists in `packages/integrations/test-integration-drupal`.
4. Verify that "Sections" group appears in Storybook sidebar.
5. Click on a section (e.g., "Introduction") and verify it displays the content from JSON interpolated into the template.

## Next Steps
- Migrate existing projects to use `sections.json` instead of `.mdx` files manually if needed.
- Enhance the `section.mdx` template with more dynamic components if required.
