## 1. Create Shared Config Module

- [x] 1.1 Create `packages/storybook-addon-designbook/src/config.ts` with `findConfig(startDir?)` and `loadConfig(startDir?)` functions
- [x] 1.2 Implement walk-up directory traversal (check `.yml` and `.yaml` extensions)
- [x] 1.3 Implement dist path resolution relative to config file location
- [x] 1.4 Add config module to addon's package.json exports (`@designbook/storybook-addon-designbook/config`)

## 2. Refactor Addon Consumers

- [x] 2.1 Refactor `preset.ts` `viteFinal` to use `loadConfig()` instead of hardcoded `cwd()` resolution
- [x] 2.2 Refactor `preset.ts` `stories` function to use `loadConfig()` for dist directory
- [x] 2.3 Verify Storybook integration still works with the refactored preset

## 3. Refactor Agent Tooling

- [x] 3.1 Replace `load-config.cjs` with a thin wrapper that delegates to the shared module
- [x] 3.2 Verify `set-env.sh` still sets all `DESIGNBOOK_*` environment variables correctly
- [x] 3.3 Test agent config resolution from a subdirectory (simulating workspace scenario)

## 4. Verification

- [x] 4.1 Test: config in current directory is found
- [x] 4.2 Test: config found in ancestor directory when not in cwd
- [x] 4.3 Test: defaults applied when no config exists
- [x] 4.4 Test: dist path resolved relative to config location, not cwd
- [x] 4.5 Verify existing `test-integration-drupal` Storybook still starts correctly
