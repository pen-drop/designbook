## 1. Upgrade Addon Package

- [x] 1.1 Update `packages/storybook-addon-designbook/package.json`: replace `"next"` with `"^10.0.0"` for `storybook`, `@storybook/addon-docs`, `@storybook/react-vite`
- [x] 1.2 Check `@storybook/types` version and update to `^10.0.0` if needed
- [x] 1.3 Run `pnpm install` and resolve any peer dependency conflicts (use `pnpm why` if needed)
- [x] 1.4 Run `pnpm --filter storybook-addon-designbook build` and fix any TypeScript or build errors
- [x] 1.5 Verify no broken imports by checking build output for missing-export warnings

## 2. Upgrade Integration Package

- [x] 2.1 Update `packages/integrations/test-integration-drupal/package.json`: bump `storybook`, `@storybook/html`, `@storybook/html-vite`, `@storybook/addon-docs`, `@storybook/addon-themes`, `@storybook/addon-vitest` from `^9.1.x` to `^10.0.0`
- [x] 2.2 Check `storybook-addon-sdc ^0.15.1` for Storybook 10 compatibility; update or pin if needed
- [x] 2.3 Run `pnpm install` again and resolve conflicts
- [x] 2.4 Start dev server: `pnpm --filter test-integration-drupal storybook` — fix any startup errors

## 3. Fix Breaking API Changes

- [x] 3.1 Review Storybook 9→10 migration guide for manager/preview API changes
- [x] 3.2 Update `.storybook/` config files in addon and integration packages if formats changed
- [x] 3.3 Fix any `StoryContext` or `composeStories` type import changes in addon source
- [x] 3.4 Fix any `@storybook/addon-vitest` config format changes

## 4. Verify Story Validation

- [x] 4.1 Run `pnpm --filter test-integration-drupal test` — verify all story validation tests pass
- [x] 4.2 Confirm story index is populated (all `.story.yml` and `.scenes.yml` files indexed without warnings)
- [x] 4.3 Confirm rendering errors are still reported correctly (regression check)

## 5. Cleanup & CI

- [x] 5.1 Remove any temporary `overrides` or workarounds added during migration
- [x] 5.2 Verify `pnpm --filter storybook-addon-designbook lint` passes
- [ ] 5.3 Commit changes and verify CI pipeline passes (build + tests)
