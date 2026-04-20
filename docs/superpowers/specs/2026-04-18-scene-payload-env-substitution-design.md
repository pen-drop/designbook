# Scene-Payload Env-Var-Substitution

Date: 2026-04-18
Status: Approved (brainstorming)

## Motivation

A post-workflow audit of `design-shell` surfaced a hard blocker that cost three retries on the `create-scene` task:

- `.agents/skills/designbook/design/rules/scenes-constraints.md:10-12` mandates the placeholder form in scene files — `component: "$DESIGNBOOK_COMPONENT_NAMESPACE:header"` — and references a "workflow bootstrap (Rule 0)" as the resolution point.
- No such resolution step exists. Verified at `packages/storybook-addon-designbook/src/validators/scene.ts:107`: the scene validator does a literal string compare (`!ids.has(obj.component)`) against the live components inventory (`test_integration_drupal:page`, …).
- `interpolate()` in `packages/storybook-addon-designbook/src/template/interpolate.ts:41-51,85-92` already implements the `$VAR` / `${VAR}` substitution used by `expandFileDeclarations` / `expandResultDeclarations` — but only on template strings (paths, titles). No caller invokes it on the data payload of `workflow done --data`.

The rule describes the intended behavior; the code that would realize it has never been written. Every scene submission via `--data` currently fails validation until the author manually substitutes the placeholder.

## Scope

One workstream in `packages/storybook-addon-designbook` plus a one-line update to the scenes-constraints rule:

1. **Same mechanism, new invocation point.** Extract the existing env-var substitution regex from `interpolate.ts` into a shared helper and apply it to every string leaf of the data payload at `workflow done --data` time — before the file is written to disk and before any validator runs.
2. **Skill doc correction.** Remove the phantom "Rule 0" reference in `scenes-constraints.md` and document the real resolution point: the engine substitutes `$DESIGNBOOK_*` on submission; the file on disk stores the resolved literal.

### Out of Scope

- Lazy / read-time substitution (Storybook's scene-builder resolving on read). Scene-builder uses `$variable` for `with:`-provided values (`scene-builder.ts:30-39`), a different mechanism; leaving it untouched keeps concerns separate.
- New opt-in markers for fields that should/should not be substituted. The shared regex already narrowly matches `$[A-Z_][A-Z0-9_]*` and `${[A-Z_][A-Z0-9_]*}` — lowercase and numeric-leading tokens like `$5` or `$foo` are never matched.
- Substitution of JSONata `{{ … }}` expressions in data payloads. Those remain a template-string concern.

### Already Applied in the Session Preceding This Spec

Not part of this spec's implementation but context-relevant:

- `design-shell` run 2026-04-18 completed successfully after manual substitution in the scene JSON. Fixture saved to `fixtures/drupal-web/design-shell/`.
- Audit table and root-cause analysis captured in the research review for this run.

## Architecture

### Core Principle: Reuse, Don't Duplicate

The regex, strict-by-default behavior, and envMap plumbing already exist. This spec **extracts** those primitives into a shared helper and **invokes** them on a new code path. No parallel implementation, no new conventions.

### Components

| Unit | Purpose | Interface |
|---|---|---|
| `substituteEnv(str, envMap, {lenient}): string` | Extracted from `interpolate.ts:42-51, 85-92`. Applies the `$VAR` / `${VAR}` regex to a single string. Throws on unknown env var unless `lenient: true`. | Pure function. |
| `interpolate(template, scope, options)` | Delegates to `substituteEnv()` for env-var expansion before JSONata; behavior unchanged. | Existing signature preserved. |
| `substituteEnvInData(value, envMap, {lenient, path}): unknown` | Recursive walker over arrays/objects. Applies `substituteEnv()` to every string leaf. Threads a dotted `path` for error messages. | Pure function over JSON-compatible values. |
| Hook in `workflow-resolve.ts` data-write path | Calls `substituteEnvInData(payload, envMap)` before the file is written via `writeFile`. | In-place wiring; no new exported surface. |

### Data Flow

```
workflow done --data '{"scene-file": {...}}'
           │
           ▼
  parseJSON(payload)
           │
           ▼
  substituteEnvInData(payload, envMap)   ◀── new invocation; same regex as interpolate()
           │
           ▼
  writeFile(path, payload)               ◀── file on disk holds literal "test_integration_drupal:page"
           │
           ▼
  validateByKeys(['scene'], file, config)
           │
           ▼
  validateSceneAgainstInventory(raw)     ◀── literal compare succeeds
```

### Scope of Substitution

- **Applies to all data results submitted via `--data`**, not just scenes. Consistent with the path-interpolation story (already runs everywhere that `decl.path` is set).
- **Applies to every string leaf** of the payload. No field-level allow/deny list. The narrow regex already protects against accidental matches in user content.
- **Unknown env var → hard error** with payload-path context, e.g.:
  `Unknown environment variable $TYPO at scene-file.scenes[0].items[0].component`.
  Matches `interpolate()` strict default. Lenient mode is not exposed at this call site — data results should never silently preserve placeholders.

### Hook Location

`workflowDone` in `workflow.ts:870` processes `--data` in the loop at `workflow.ts:907` (`for (const [key, value] of Object.entries(dataPayload))`). Each `value` is handed to `serializeForPath()` at `workflow.ts:914` before `writeFileSync` at `workflow.ts:937`.

Injection:

1. Build `envMap` once at the top of the block, using the existing `buildEnvMap(options.config)` (`workflow-resolve.ts:714`) — `options.config` is already threaded into `workflowDone`.
2. Call `substituteEnvInData(value, envMap)` between the loop entry and the `serializeForPath` call. The substituted value feeds both the file write AND the schema validation at `workflow.ts:944` — so literals propagate to every downstream check.

No new plumbing across the call boundary — all inputs are already in scope.

### File-on-Disk Semantics

- Scene files, section files, and any data result on disk contain **resolved literals** after a successful submission.
- Scene files remain human-editable; the resolved namespace is a consequence of which provider the workspace targets (already true for Twig `{% include %}` paths elsewhere).
- Storybook's scene-builder (`scene-builder.ts`) continues to read literals and resolves `$variable` only against `with:` bindings — unchanged.

## Testing

### Unit — `src/template/__tests__/substitute-env.test.ts`

- `substituteEnv('$X:page', {X: 'ns'})` → `'ns:page'`.
- `substituteEnv('${X}:page', {X: 'ns'})` → `'ns:page'`.
- `substituteEnv('Cost: $5', {})` → `'Cost: $5'` (regex does not match lowercase-leading or numeric tokens).
- `substituteEnv('$FOO', {})` throws with `Unknown environment variable` in the message.
- `substituteEnv('$FOO', {}, { lenient: true })` → `'$FOO'`.

### Unit — `src/template/__tests__/substitute-env-in-data.test.ts`

- Nested object: `{a: {b: [{component: '$X:p'}]}}` with `{X: 'ns'}` → `{a: {b: [{component: 'ns:p'}]}}`.
- Unknown var throws with `at a.b[0].component` in the error message.
- Non-string leaves (numbers, booleans, null) pass through untouched.

### Regression — `src/template/__tests__/interpolate.test.ts`

- Existing test file stays green. `interpolate()` uses `substituteEnv()` internally — no observable behavior change.

### Integration — `src/cli/__tests__/workflow-done-data-substitution.test.ts`

- `workflow done --data '{"scene-file":{"scenes":[{"items":[{"component":"$DESIGNBOOK_COMPONENT_NAMESPACE:page"}]}]}}'` with a configured envMap writes the scene file with the literal namespace.
- Subsequent `validateSceneAgainstInventory` passes when the literal namespace matches a live component id.
- Submission with an undefined env var fails the CLI call before the file is written, and no partial file is left on disk.

## Skill Doc Update

File: `.agents/skills/designbook/design/rules/scenes-constraints.md`

Replace:

```
> `DESIGNBOOK_COMPONENT_NAMESPACE` is set by the workflow bootstrap (Rule 0).
```

with:

```
> The engine substitutes `$DESIGNBOOK_COMPONENT_NAMESPACE` (and any `$VAR` /
> `${VAR}` env token) on `workflow done --data` submission. The scene file on
> disk contains the resolved provider literal (e.g. `test_integration_drupal:page`).
```

No other rule, task, or blueprint file changes.

## Migration & Back-Compat

None. Per project policy (`CLAUDE.md` → Breaking Changes), existing on-disk scene files are disposable. Files authored before this change that literally contain `$DESIGNBOOK_COMPONENT_NAMESPACE:…` fail validation today and will continue to fail until re-submitted; re-submission resolves them. No shim.

## Risks

- **Accidental substitution in user content.** Mitigation: regex is narrow (uppercase-leading, underscore-allowed). Worst case a user deliberately stores `$FOO_BAR` with no such env var: today that string survives; with this change it fails loudly. Acceptable — fail-fast is the goal.
- **Env var defined but empty string.** Result: empty string in payload. Matches current `interpolate()` behavior; no special-case added.
- **Performance.** One extra tree walk per data result. Payloads are small (kilobytes); walk is O(n) in string leaves. Negligible.
