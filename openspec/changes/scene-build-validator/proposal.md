## Why

The scene validation pipeline has a gap: `validateSceneFile()` only checks YAML structure statically, but build-time errors (like the `$content` string crash in `needsBuilding()`) pass through undetected. The log validator (`log.ts`) and storybook validator (`storybook.ts`) were added to catch these, but both are fragile — `console.error` doesn't write to `storybook.log`, and the storybook validator requires a running Storybook and can't detect transient build errors.

The fix: run the actual scene build (`buildSceneModule()`) as the validator. If it throws, `valid: false`. Remove the log and storybook validators.

## What Changes

- Replace scene validation chain (`scene.ts` → `storybook.ts` → `log.ts`) with a single build-based validator that calls `buildSceneModule()`
- **BREAKING**: Remove `log.ts` validator and `storybook.ts` validator
- Remove log/storybook validators from component validation chain too
- Fix `needsBuilding()` in `builder-registry.ts` to guard against non-object values (the root cause of the `$content` crash)

## Capabilities

### New Capabilities
- `scene-build-validation`: Scene validator that runs the actual build pipeline (`buildSceneModule()`) and reports build errors as validation failures

### Modified Capabilities
- `addon-cli-validation`: Remove log and storybook validators from the validation registry; scene validation uses build-based approach instead

## Impact

- `packages/storybook-addon-designbook/src/validators/scene.ts` — rewrite to call `buildSceneModule()`
- `packages/storybook-addon-designbook/src/validators/log.ts` — delete
- `packages/storybook-addon-designbook/src/validators/storybook.ts` — delete
- `packages/storybook-addon-designbook/src/validation-registry.ts` — simplify scene + component registration
- `packages/storybook-addon-designbook/src/renderer/builder-registry.ts` — fix `needsBuilding()` type guard
