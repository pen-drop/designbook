## 1. Dependencies & Configuration

- [x] 1.1 Add `@storybook/addon-vitest` and `vitest` as optional peer dependencies in `packages/storybook-addon-designbook/package.json`
- [x] 1.2 Add `@storybook/addon-vitest` and `vitest` as dev dependencies in `packages/integrations/test-integration-drupal/package.json`
- [x] 1.3 Register `@storybook/addon-vitest` in `test-integration-drupal/.storybook/main.js` addons array

## 2. Vitest Workspace Setup

- [x] 2.1 Create `vitest.config.ts` in `test-integration-drupal/` with a Storybook project entry pointing to `.storybook/`
- [x] 2.2 Verify `vitest --project=storybook` discovers `.story.yml` and `.scenes.yml` stories
- [x] 2.3 Run vitest against a single component story (e.g., `heading`) and confirm HTML output is produced without errors

## 3. CLI `validate story` Command

- [x] 3.1 Add `validate story [name]` subcommand to `packages/storybook-addon-designbook/src/cli.ts`
- [x] 3.2 Implement story validation via vitest CLI — filter by file path pattern (e.g. `heading`), run all when omitted
- [x] 3.3 Handle missing `vitest` dependency gracefully — print helpful error message and exit with code 1
- [x] 3.4 Report results: vitest default reporter shows success/failure with error details
- [x] 3.5 Exit with non-zero code when any story fails

## 4. Build & Integration

- [x] 4.1 Rebuild addon (`pnpm --filter storybook-addon-designbook run build`) and verify `validate story` command is available
- [x] 4.2 Run `validate story heading` against test-integration-drupal and confirm it passes
- [x] 4.3 Run `validate story` (all stories) and verify scenes + component stories are both discovered and validated
- [x] 4.4 Introduce a deliberate Twig error in a component and verify `validate story` catches it with a clear error message

## 5. Remove `validate scene` Command

- [x] 5.1 Remove `validate scene` subcommand from `src/cli.ts`
- [x] 5.2 Remove `src/validators/scene.ts` and its types
- [x] 5.3 Remove scene validation step from `debo-design-shell.md` workflow
- [x] 5.4 Remove scene validation step from `debo-design-screen.md` workflow

## 6. Workflow Integration

- [x] 6.1 Update `debo-design-component.md` workflow — add `validate story` step after existing `validate component` step
- [x] 6.2 Update `debo-design-screen.md` workflow — replace `validate scene {section-id}` step with `validate story {section-id}`
- [x] 6.3 Update `debo-design-shell.md` workflow — replace `validate scene` step with `validate story shell`
- [x] 6.4 Update `designbook-components-sdc/SKILL.md` — add `validate story` as Step 10 after existing `validate component` in Step 9
