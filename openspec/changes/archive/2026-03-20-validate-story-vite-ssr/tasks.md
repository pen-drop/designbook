## 1. Fix buildExportName (dist rebuild)

- [x] 1.1 Verify `src/renderer/scene-metadata.ts` `buildExportName` strips em-dashes (`replace(/[^a-zA-Z0-9\s]/g, ' ')`)
- [x] 1.2 Rebuild dist: `pnpm build` in `packages/storybook-addon-designbook`
- [x] 1.3 Verify `dist/preset.js` `buildExportName` now strips em-dashes

## 2. WorkflowTask schema — files + validation

- [x] 2.1 Add `ValidationFileResult` interface to `workflow-types.ts`: `{ file, type, valid, error?, html?, skipped?, last_validated, last_passed?, last_failed? }`
- [x] 2.2 Add `files?: string[]` to `WorkflowTask` (paths relative to designbook dir)
- [x] 2.3 Add `requires_validation?: boolean` to `WorkflowTask` — set to `true` by `workflow update --files`, cleared after `workflow validate`
- [x] 2.4 Add `validation_results?: ValidationFileResult[]` to `WorkflowTask`
- [x] 2.5 Panel derives status from results (no stored `validation_status` field):
  - `requires_validation=true` + no results → pending
  - `requires_validation=true` + has results → outdated
  - all valid → passed; any invalid → failed; all skipped → skipped

## 3. ValidationRegistry

- [x] 3.1 Create `src/validation-registry.ts` with `ValidationRegistry` class
- [x] 3.2 `register(pattern: string | string[], validate: ValidatorFn)` — last registration wins
- [x] 3.3 `async validate(file, config)` — finds matching validator via `minimatch`, returns `ValidationFileResult`
- [x] 3.4 If no validator matches: return `{ file, valid: true, skipped: true, type: 'unknown' }`
- [x] 3.5 Export `defaultRegistry` instance with built-in validators pre-registered:
  - `**/*.component.yml` → `validateComponent`
  - `**/data-model.yml` → `validateDataModel`
  - `**/design-tokens.yml` → `validateTokens`
  - `**/data.yml` → `validateData`
  - `**/*.jsonata` → `validateViewMode`
  - `**/*.story.yml`, `**/*.scenes.yml` → `validateViaStorybookHttp`
- [x] 3.6 `validateViaStorybookHttp(file, config)`: checks `localhost:{storybook.port}`, hits `/__validate?file=<path>`, returns results; `skipped: true` if unreachable

## 4. `/__validate` HTTP endpoint in Vite plugin

- [x] 4.1 Add `/__validate` middleware in `configureServer` in `vite-plugin.ts`
- [x] 4.2 Accept `?file=<path>` query param
- [x] 4.3 `server.moduleGraph.invalidateModule()` before `ssrLoadModule`
- [x] 4.4 Iterate named exports (skip `default`), call `render(args)`, catch errors per story
- [x] 4.5 Return JSON array: `[{ valid, label, html?, error? }]`
- [x] 4.6 Rebuild dist

## 5. Integration extension points

- [x] 5.1 Add `validate.patterns` to `DesignbookConfig` — map of glob → `{ command: string }` (via `[key: string]: unknown` index + `applyConfigExtensions()`)
- [x] 5.2 In `defaultRegistry` init: read `config.validate.patterns`, register command-based validators
- [x] 5.3 Add `storybook.port` to `DesignbookConfig` (default: 6009, read via `config['storybook.port']`)
- [x] 5.4 Define `validatorExtensions` export convention: addon preset exports `{ pattern, validate }[]`
- [ ] 5.5 In `workflow validate`: load `validatorExtensions` from configured addons, register before running

## 6. `workflow update` — `--files` flag (nur speichern)

- [x] 6.1 Add `--files <paths...>` option to `workflow update` in `cli.ts`
- [x] 6.2 Save `files[]` (as `TaskFile[]` with per-file `requires_validation: true`) to task in tasks.yml
- [x] 6.3 No auto-validation on update — only store

## 7. `workflow validate <name>` — einziger Validate-Befehl

- [x] 7.1 Add `workflow validate <name>` command to `cli.ts`
- [x] 7.2 Load all tasks from workflow, collect all `files[]` across tasks
- [x] 7.3 For each file: call `defaultRegistry.validate(file, config)`
- [x] 7.4 Write `validation_result` per TaskFile in tasks.yml, clear per-file `requires_validation`
- [x] 7.5 Output one JSON line per file: `{ task, file, type, valid, error?, html?, skipped? }`
- [x] 7.6 Exit code 1 if any `valid: false`

## 8. Thin-wrapper validate subcommands (standalone use)

- [x] 8.1 Refactor `validate component`, `validate tokens`, `validate data`, `validate data-model` — JSON output, replace vitest-based `validate story` with HTTP approach
- [x] 8.2 Add `validate view-mode <name>`
- [x] 8.3 All output as JSON

## 9. Storybook panel — files + validation sichtbar

- [x] 9.1 Show `files[]` list per task in the workflow panel (relative paths)
- [x] 9.2 Per file: show validation badge ✅ passed / ❌ failed / ⏭ skipped / ⏳ pending
- [x] 9.3 On failed: show `error` inline below the file path
- [ ] 9.4 "Re-validate" button per workflow → triggers `workflow validate <name>` via CLI (channel or exec)
- [x] 9.5 Panel auto-refreshes after tasks.yml changes (already via file-watcher + WebSocket)

## 10. Remove vitest dependencies

- [x] 10.1 Remove `@storybook/addon-vitest` from `peerDependencies` in `storybook-addon-designbook/package.json`
- [x] 10.2 Remove `@vitest/browser`, `@vitest/browser-playwright`, `vitest` from `test-integration-drupal/package.json`
- [x] 10.3 Delete `packages/integrations/test-integration-drupal/vitest.config.ts`
- [x] 10.4 Delete `packages/integrations/test-integration-drupal/.storybook/vitest.setup.ts`

## 11. Update skills — `workflow update --files` + fix loop

Skills call `workflow update --status done --files [...]` when done, then check validation:

```
workflow update debo-design-component create-button --status done --files [...]
workflow validate debo-design-component
# → liest output, fixt eigene broken files
workflow validate debo-design-component  # repeat bis passed
```

- [ ] 11.1 `designbook-components-sdc/SKILL.md` — add `--files`, replace `validate component/story` + `designbook-component-validate` with fix loop
- [ ] 11.2 `designbook-components-sdc/resources/shell-generation.md` — same
- [ ] 11.3 `debo-design-component.md` — add `--files`, replace validate story
- [ ] 11.4 `debo-design-screen.md` — add `--files`, replace validate story
- [ ] 11.5 `debo-design-shell.md` — add `--files`
- [ ] 11.6 `designbook-tokens/SKILL.md` — add `--files design-tokens.yml`
- [ ] 11.7 `designbook-sample-data/SKILL.md` — add `--files data.yml`
- [ ] 11.8 `designbook-data-model/SKILL.md` — add `--files data-model.yml`
- [ ] 11.9 `designbook-view-modes/SKILL.md` — add `--files *.jsonata`
- [ ] 11.10 `designbook-scenes/SKILL.md` — add `--files *.scenes.yml`
- [ ] 11.11 `designbook-figma-twig-sdc/steps/validate-twig.md` — add `workflow validate` at end
- [ ] 11.12 `designbook-figma-components-sdc/SKILL.md` — add `--files`
- [ ] 11.13 `designbook-figma-stories-sdc/SKILL.md` — add `--files`

## 12. Deprecate `designbook-component-validate`

- [ ] 12.1 Mark deprecated in `SKILL.md`, point to `workflow validate`
- [ ] 12.2 Remove browser-agent/screenshot logic

## 13. Tests

### Unit Tests

- [ ] 13.1 `ValidationRegistry` unit tests: `register()` last-wins, `validate()` minimatch matching, fallthrough → `skipped: true`
- [ ] 13.2 `validateViaStorybookHttp` unit tests: mock `fetch()` — unreachable → `skipped`, 200+results → parsed, render error → `valid: false`
- [ ] 13.3 `workflow update --files` unit test: confirm `files[]` + `requires_validation: true` written to tasks.yml

### Integration Test (mechanism)

- [ ] 13.4 `/__validate` endpoint: start real Vite dev server with test story fixture → GET `/__validate?file=...` → `[{ valid, label, html }]` → server.close()
- [ ] 13.5 `workflow validate debo-design-component` smoke test: files in tasks.yml → JSON output per file, `requires_validation` cleared
- [ ] 13.6 Storybook not running → story shows `skipped: true`, exit 0
- [ ] 13.7 Introduce Twig error → `valid: false` with parseable error → fix → re-run → passed

### Quality

- [ ] 13.8 Panel shows files + derived validation badges + timestamps per task
- [ ] 13.9 `npm run lint` in `packages/storybook-addon-designbook`
