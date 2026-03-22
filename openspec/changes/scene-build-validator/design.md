## Approach

Replace the multi-step scene validation chain with a single build-based validator.

### Current chain (remove)
```
scenes.yml → validateSceneFile() → validateStorybook() → validateLog()
                static YAML check    needs running SB     reads storybook.log
```

### New chain
```
scenes.yml → validateSceneBuild()
                calls buildSceneModule()
                throws → valid: false
```

## Key Decisions

### Reuse `buildSceneModule()` directly
The validator imports `buildSceneModule()` from `renderer/scene-module-builder.ts` and calls it with the same parameters the Vite plugin uses. If it returns successfully, the scene is valid. If it throws, the error message becomes the validation error.

### Fix `needsBuilding()` type guard
The root cause crash (`'entity' in "$content"`) is a missing type guard. Fix it so the build doesn't crash on string values in slot arrays. This is a separate bugfix but included since it's the motivating case.

### Remove log.ts and storybook.ts validators
- `log.ts`: console.error doesn't write to storybook.log, so this validator never sees build errors
- `storybook.ts`: requires running Storybook, error stories are transient, HTTP 200 doesn't mean no errors

### Component validation simplification
Components currently chain: `validateComponent()` → `validateStorybook()` → `validateLog()`. Remove the storybook/log steps — component schema validation is sufficient. Build validation is for scenes only.

## Data Flow

```
validateSceneBuild(file, config)
  │
  ├── readFileSync(file) → parseYaml()
  ├── buildSceneModule(file, parsed, designbookDir, {})
  │     ├── loadDataModel()
  │     ├── loadSampleData()
  │     ├── BuilderRegistry (entity, scene, component builders)
  │     └── buildCsfModule() → CSF string
  │
  ├── success → { valid: true }
  └── catch(e) → { valid: false, error: e.message }
```
