## Scene Build Validation

### Requirements

1. `validateSceneBuild(file, config)` runs `buildSceneModule()` on the given `*.scenes.yml` file
2. Returns `ValidationFileResult` with `type: 'scene'`
3. If build succeeds: `valid: true`
4. If build throws: `valid: false`, `error` contains the exception message
5. Derives `designbookDir` from `config.dist` (same as other validators)
6. Works without a running Storybook instance

### Integration

7. Registered in `defaultRegistry` for pattern `**/*.scenes.yml`
8. Replaces the previous chain (`validateSceneFile` → `validateStorybook` → `validateLog`)
9. Component validation (`**/*.component.yml`) uses only `validateComponent()` — no storybook/log

### Bug fix

10. `needsBuilding()` in `builder-registry.ts` must check `typeof n === 'object' && n !== null` before using `in` operator
