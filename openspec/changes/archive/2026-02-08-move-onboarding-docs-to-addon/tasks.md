## 1. Move Files

- [x] 1.1 Create `packages/storybook-addon-designbook/src/onboarding` directory.
- [x] 1.2 Move `packages/integrations/test-integration-drupal/.storybook/onboarding` contents to the new directory.

## 2. Configure Addon

- [x] 2.1 Update `packages/storybook-addon-designbook/package.json` to include `src/onboarding` in published files (or ensuring `dist` copy if needed).
- [x] 2.2 Configure `tsup` or build script to copy `src/onboarding` to `dist/onboarding`.
- [x] 2.3 Implement `stories` export in `packages/storybook-addon-designbook/src/preset.ts` to automatically append the onboarding docs path.

## 3. Update Consumer

- [x] 3.1 Update `packages/integrations/test-integration-drupal/.storybook/main.js` to REMOVE local onboarding reference (addon should handle it).
- [x] 3.2 Remove local `onboarding` reference.

## 4. Verification

- [x] 4.1 Run `npm run storybook --workspace=packages/integrations/test-integration-drupal`.
- [x] 4.2 Verify "Product" story still loads.
- [x] 1.3 Move assets if any.
