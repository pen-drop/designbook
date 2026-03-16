## Why

Scene references (`type: scene`) support passing `$variable` placeholders via `with:`, but the existing tests only verify slot substitution — there is no test coverage for props substitution. This gap means a regression in prop passing would go undetected.

## What Changes

- Extend `shell.scenes.yml` fixture to include a `$`-variable prop placeholder (e.g. `theme: $theme`) on the root page component
- Add a scene to `test.scenes.yml` that references the shell with explicit `with: { theme: ... }` prop values
- Add unit tests in `scene-builder.test.ts` verifying that props are substituted and present on the built `ComponentNode`
- Add integration test in `scene-module-builder.test.ts` verifying the generated module string contains the expected prop key/value

## Capabilities

### New Capabilities
<!-- none — this is purely test/fixture coverage, no new runtime behaviour -->

### Modified Capabilities
- `scenes`: Tests and fixtures extended to cover props substitution via `with:` in scene references

## Impact

- `src/renderer/__tests__/fixtures/shell.scenes.yml` — add `props: { theme: $theme }` to page item
- `src/renderer/__tests__/fixtures/test.scenes.yml` — add a `WithShellProps` scene
- `src/renderer/__tests__/scene-builder.test.ts` — new test cases for prop passing
- `src/renderer/__tests__/scene-module-builder.test.ts` — new integration assertion for prop value in generated module
