## 1. Skill Creation

- [x] 1.1 Create `designbook-data-model-drupal` skill structure (`SKILL.md`, `scripts/validate-and-save.cjs`).
- [x] 1.2 Implement logic in `validate-and-save.cjs` to validate `DESIGNBOOK_TECHNOLOGY` is `drupal`.
- [x] 1.3 Implement data transformation logic: Map `content` -> `node`, `assets` -> `media`.
- [x] 1.4 Implement field prefixing logic (`field_` for non-bundle keys).
- [x] 1.5 Implement JSON saving logic using `DESIGNBOOK_DIST`.

## 2. Workflow Integration

- [x] 2.1 Update `/debo-data-model` workflow to check `DESIGNBOOK_TECHNOLOGY`.
- [x] 2.2 Add conditional logic to the workflow: if `drupal`, execute `designbook-data-model-drupal`; else, execute `designbook-data-model`.
- [x] 2.3 Verify the workflow correctly routes based on configuration.

## 3. Verification

- [x] 3.1 Create a test `data-model-draft.json` with generic entities.
- [x] 3.2 Run the new skill manually with `DESIGNBOOK_TECHNOLOGY=drupal` and verify the output structure.
- [x] 3.3 Verify field prefixes are applied correctly.
- [x] 3.4 Verify `content` and `assets` are mapped to `node` and `media`.
