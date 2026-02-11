## 1. Schema & Tools

- [x] 1.1 Create `schema/sections.json` defining the structure for product sections data.
- [x] 1.2 Update `designbook-data-model` skill or create `designbook-sections` logic to handle validation against this schema (if skill update is needed, otherwise inline validation).

## 2. Workflow Refactoring

- [x] 2.1 Rename `.agent/workflows/debo-product-roadmap.md` to `.agent/workflows/debo-product-sections.md`.
- [x] 2.2 Update `debo-product-sections.md` to guide the user through section creation and save data to `designbook/sections.json` instead of individual files.
- [x] 2.3 Verify workflow execution locally (dry run or actual run).

## 3. Storybook Addon Implementation

- [x] 3.1 Create a mechanism (e.g., `src/indexer.ts` or `src/loader.ts`) to load `designbook/sections.json` and generate stories. Use `src/onboarding/section-about-team.mdx` as the template/structure for these stories.
- [x] 3.2 Rename `src/onboarding/section-about-team.mdx` to `src/onboarding/section.mdx` (or similar template file) and delete all other `section-*.mdx` files (`section-blog-contact.mdx`, `section-homepage.mdx`, etc).
- [x] 3.3 Update `packages/storybook-addon-designbook/src/preset.ts` to register the new indexer/loader or configure `stories` glob handling.
- [x] 3.3 Ensure `DeboSectionDetail` (or relevant component) can accept dataprops passed from the generated story.

## 4. Integration & Verification

- [x] 4.1 Update `packages/integrations/test-integration-drupal/.storybook/main.js` to include `../designbook/sections.json` (or configured path) in the stories array if required by the new indexer approach.
- [x] 4.2 Run `openspec verify` logic manually: Start Storybook and verify sections appear as stories.
- [x] 4.3 Verify that updating `sections.json` updates the Storybook UI (HMR or reload).
