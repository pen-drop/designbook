## 1. Skill Implementation (Handler)

- [x] 1.1 Create `designbook-data-model` skill directory and `SKILL.md`
- [x] 1.2 Create `steps/process-data-model.md` to define the skill's logic
- [x] 1.3 Create `scripts/validate-and-save.cjs` to handle JSON validation and file writing
- [x] 1.4 Verify skill works by running it with test data (CLI test)

## 2. Storybook Addon Implementation (Viewer)

- [x] 2.1 Update `storybook-addon-designbook/src/hooks/useDesignbookData.js` (or similar) to load `designbook/data-model.json`
- [x] 2.2 Create `DeboDataModelCard` component to visualize the data model (Summary of bundles grouped by entity type)
- [x] 2.3 Integrate `DeboDataModelCard` into the addon's main view (or relevant section) with "Read-Only" indicator
- [x] 2.4 Verify addon displays data correctly using a sample `designbook/data-model.json` (Check grouping and summary)

## 3. Workflow Implementation (Interview)

- [ ] 3.1 Update `.agent/workflows/debo-data-model.md` to focus on gathering requirements and set `id: debo-data-model`
- [ ] 3.2 Change the final step of the workflow to invoke the `designbook-data-model` skill
- [ ] 3.3 Verify the full workflow end-to-end (interactive test)
