## 1. Setup Workspaces

- [x] 1.1 Configure root content to support NPM workspaces.
- [x] 1.2 Update root `package.json` to define `workspaces` array.
- [x] 1.3 Verify existing scripts and dependencies for compatibility.

## 2. Refactor Packages

- [x] 2.1 Ensure `packages/storybook-addon-designbook` is correctly structured under `packages/`.
- [x] 2.2 Verify `storybook-addon-designbook` can be built from root workspace command.
- [x] 2.3 Move any other shared code to `packages/` if applicable (e.g., `source/`?). (Decision: Stick to what helps integration tests for now).

## 3. Drupal Integration Tests

- [x] 3.1 Create `packages/integrations/test-integration-drupal` directory.
- [x] 3.2 Initialize `package.json` for the test package.
- [x] 3.3 Move `components`, `config`, `css`, `designbook`, `icons`, `images`, `source`, `templates`, `.storybook`, `vite.config.js` from root to `packages/integrations/test-integration-drupal`.
- [x] 3.4 Update generic paths in config files to be relative to the new package root.
- [x] 3.5 Configure Storybook in the integration package.
- [x] 3.5 Ensure it can import from other packages if needed (or just run independently).

## 4. Verification

- [x] 4.1 Run `npm install` in root to link all workspaces.
- [x] 4.2 Run `npm run build --workspaces` to build all packages.
- [x] 4.3 Run `npm test --workspace=packages/integrations/test-integration-drupal` to verify test execution.
- [x] 4.4 Run `npm run storybook --workspace=packages/integrations/test-integration-drupal` and verify using browser agent.
