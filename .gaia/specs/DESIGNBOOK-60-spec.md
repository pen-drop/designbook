# DESIGNBOOK-60 — Spec & Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL in coding: use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Ticket:** Untangle module seams in `storybook-addon-designbook`
**Workflow:** `gaia_chore` · **Sub-work:** `work:code` · **Task-Art:** code refactor (no user-facing behaviour change)
**Package:** `packages/storybook-addon-designbook`
**Runtime surface:** none for the refactor itself → evidence is `pnpm check`, static grep/module-graph assertions, byte-identical generated importPaths, plus one `debo-test` smoke pass proving the CLI still runs end-to-end.
**Spec method:** `superpowers:writing-plans` (design fixed at qualification — no package split; only the internal module boundary is open).

---

## Global Constraints

- **One published package.** `name` = `storybook-addon-designbook`, `bin` = `storybook-addon-designbook`, `exports` **keys** unchanged. No package split, no rename. (AC-8)
- **Generated importPaths byte-identical.** The literal strings emitted by `vite-plugin.ts` (`storybook-addon-designbook/dist/pages/mount-react.js`, `…/dist/components/pages/DeboSectionPage.js`) and `csf-prep.ts` (`storybook-addon-designbook/renderer`), and the fixture `packages/integrations/test-integration-drupal/index.json` importPaths (`../../storybook-addon-designbook/dist/pages/*.stories.jsx`), must not change by a single byte. (AC-8)
- **No migration / back-compat / legacy-artifact code** (per `CLAUDE.md`). On-disk artifacts are disposable; update writers/readers to the new shape.
- **No new TS plugin API for integrations.** Integrations extend data (tasks/rules/blueprints/schemas), not code.
- **`pnpm check` (typecheck → lint → test) must be green** at the end of every task, run from repo root.

---

## 1. Problem and reconciliation with the current tree

The qualification handoff carries an architecture review (2026-09-10, three Fable analysis agents) that rejected splitting the package into four published packages and instead asked to fix the **internal** module seams and remove two "dead" extension seams. The rejection of the package split stands and is not re-litigated.

**However**, this branch (`feat/designbook-60-untangle-mo`, HEAD `9d5fac97` = `origin/next`) is **stacked on the already-landed DESIGNBOOK-56 + DESIGNBOOK-59 intake/`execute-workflow` refactor**. The architecture review was run against a tree **predating** that refactor. Re-verification against the real current code (six read-only module-graph sweeps) shows **four** of the review's findings no longer match the code:

| # | Ticket finding | Current-tree reality (evidence) | Consequence for its AC |
|---|---|---|---|
| **R1** | Finding 3: import **cycle** `vite-plugin.ts ↔ story-entity.ts`; `vite-plugin.ts:12-14` imports `log/digest`. | **No cycle.** `vite-plugin → {story-entity, reference-entity}` is one-directional; `story-entity.ts:12` → `renderer/scene-metadata.ts` which is a **zero-import leaf**; no back-edge exists. `vite-plugin.ts:12-14` are `workflow-utils`, `story-entity`, `reference-entity` — **there is no `log`/`digest` import** and no such module is reachable from vite-plugin. | **AC-3 already green.** Reframe to "verify 0 cycles + add a cycle guardrail so it stays 0", plus relocate `buildExportName`/`scene-metadata` into `scene-model` so `story-entity`'s only edge into `renderer/` is removed. |
| **R2** | Finding 5: `inspect/capture.ts:6-7` imports `cli/capture-browser`, `cli/capture-session` (library → CLI). | **No `inspect → cli` edge.** `cli/capture-session.ts` **does not exist**; `grep "from '.*cli/" src/inspect` returns nothing. The real direction is the reverse: `cli/*` and `resolvers/region-properties.ts` import `inspect/*`. | **AC-4 second half already green.** Only AC-4 first half (relocate `resolvers/` next to the tools it adapts) is real work. |
| **R3** | Finding 6: `validation-registry.ts` and `resolvers/registry.ts` are dead (zero production importers, "only their own tests"). | **Both are live.** `validation-registry.ts` ← `workflow.ts:43` (`getValidatorKeys`), `:1826`,`:2129` (`validateByKeys`). `resolvers/registry.ts` ← `cli/workflow.ts:37,243,614` (`resolveParams`), `workflow-resolve.ts:2316-2348`, `workflow.ts:833`, barrel `resolvers/index.ts:1`. A third registry, `renderer/builder-registry.ts`, is also live (`scene-module-builder.ts:18`). | **AC-5 satisfiable by keeping them.** Its check ("for every remaining registry, at least one non-test file imports it") is **already met**. Deleting them would break `workflow.ts`, `cli/workflow.ts`, `workflow-resolve.ts`. |
| **R4** | Target-shape note: "`workflow` is already clean today (imports only `config.ts`)". | **Not clean.** `workflow.ts` imports `validation-registry.ts` (validation), `cli/submit-results-hint.ts` (cli), and dynamically `resolvers/registry.ts` (tools). So `workflow` orchestrates validation + tools; "workflow → shared only" is not achievable without inverting the validate/resolve dispatch, which is out of scope. | The allowed DAG (§2) is **refined** to `workflow → {validation, tools, shared}`. |

**The genuine, still-valid core** of the ticket (verified against the current tree):

- **AC-1 real:** `validators/{scene,data,entity-mapping}.ts` **do** import `renderer/*` (`buildSceneModule`, `readBundleFiles`, `DataModel`). Scene validation *is* "run the node-side builder and see if it throws"; there is no interface between them.
- **AC-2 real:** `validators/scene.ts:15` → `resolvers/components-index.ts:2` → `storybook.ts` (`StorybookDaemon`). A pure validation run can reach a live daemon.
- **AC-4a real:** `resolvers/` is a tools-adapter layer mislabelled as shared (`region-properties.ts` embeds the capture pipeline; `components-index.ts`/`story-match.ts` pull the daemon).
- **AC-6 real:** no import-boundary rule of any kind exists; `eslint.config.js` registers no import plugin.
- **AC-7 real:** `storybook` and `vite` are **required** peers (only `playwright` is optional in `peerDependenciesMeta`).

**Decision (confirmed by the assignee):** *Reconcile in the spec.* Do the real work (AC-1, AC-2, AC-4a, AC-6, AC-7); keep the live registries; treat AC-3 and AC-4-second-half as "verify-green + add guardrail". Record R1–R4 here so the reconciliation is not mistaken for scope-drop.

## 2. Target module shape and dependency DAG

Confirmed layout choice: **full six-directory physical restructure** under `src/`. Each source file moves into exactly one module directory; `cli.ts` stays at `src/` root as the composition root.

```
src/shared/       config, constants, logger, log/digest, template/, schema-block,
                  skill-sources, workflow-types, virtual-modules.d.ts, misc leaf consts
src/scene-model/  the node-side build+naming contract: buildSceneModule, buildExportName,
                  DataModel, readBundleFiles, scene node types (renderer/ minus the browser
                  render runtime) — parser, builders/, builder-registry, csf-prep, view,
                  validate-scene-nodes, entity-module-builder, data-pool, story-address,
                  scene-metadata, image-utils, image-providers/, jsonata-mapping-analyzer,
                  built-in-components, expression-cache, scene-handlers, mode-badges
src/validation/   validators/*, validation-registry
src/tools/        cli tool impls (capture/screenshot/matrix/extract/compare/check-story),
                  inspect/, resolvers/, reference-entity, story-entity, storybook (daemon),
                  runbook/, sync/, visual-compare-path, inspect result types
src/workflow/     workflow*.ts, workflow-lifecycle/resolve/serialize/schema-merge/utils,
                  engines/, scoring/, skill-resolver
src/addon/        manager*, preview, preset, vite-plugin, renderer runtime (renderer.ts,
                  renderer-browser.ts), components/, pages/, decorators/, hooks/,
                  withRoundTrip, withVisualCompare, use-sync-with-selector-source,
                  vitest-plugin-sdc, index.ts
src/cli.ts        composition root
```

**Allowed dependency directions (the DAG the AC-6 rule encodes):**

```
shared        →  (leaf; imports nothing from other modules)
scene-model   →  shared
validation    →  scene-model, shared
tools         →  scene-model, validation, shared
workflow      →  validation, tools, shared          (R4: orchestrates validate + resolveParams)
addon         →  scene-model, shared
cli.ts        →  everything (composition root)
```

**Hard invariants the rule must catch:**

1. No module except `cli.ts` may import `addon`.
2. `validation` may **not** import `tools`, `workflow`, or `addon` — in particular not `storybook` (the daemon) or any `resolvers/*` (AC-1, AC-2).
3. `scene-model` imports only `shared` (stays a node-safe leaf of the build contract).
4. No import cycles anywhere in `src` (AC-3 guardrail).

`__tests__` for each module travel with the module (co-located `__tests__/` dirs move with their code; shared `src/__tests__/` splits to the module each test targets).

## 3. AC-8 preservation strategy (byte-identical dist paths)

The externally-baked strings depend on **tsup entry keys** and **package.json `exports` keys/subpaths**, *not* on source-file location — verified against `tsup.config.ts` and `package.json`:

- The client bundle already uses an explicit keyed `entry` object (`'pages/mount-react': 'src/pages/mount-react.js'` → `dist/pages/mount-react.js`). The **key** pins the dist path; only the **value** (source path) changes on a move.
- The other bundles (`bundler.managerEntries/previewEntries/nodeEntries`, the CLI entry) currently pass **arrays**, so tsup mirrors `src/…` into `dist/…`. To keep `dist/index.js`, `dist/preview.js`, `dist/renderer-browser.js`, `dist/preset.js`, `dist/config.js`, `dist/manager.js`, `dist/manager-helpers.js`, `dist/vitest-plugin-sdc.js`, `dist/cli.js` **exactly where they are** after the source moves, convert those array entries to **keyed** entry objects pinning the output name (e.g. `{ 'renderer-browser': 'src/addon/renderer-browser.ts' }`).

Concrete AC-8 obligations in the restructure task:

- Update the client-bundle entry **values** to the new `src/addon/pages/…` / `src/addon/components/pages/…` paths; keep the **keys**.
- Convert `bundler.*Entries` and the CLI `entry` to keyed objects that pin `dist/*.js` names to the moved sources.
- `exports` **keys** unchanged; `exports` **values** stay `./dist/…` because the keyed entries keep the dist names. `bin` stays `./dist/cli.js` (`cli.ts` does not move).
- The generated literals in `vite-plugin.ts`/`csf-prep.ts` are string constants → they change only if edited; **do not edit them**.
- **Canary:** after the build, assert `git diff --stat` shows **no change** to `packages/integrations/test-integration-drupal/index.json` and that a rebuilt `dist/` yields byte-identical `dist/pages/*.js` and `dist/components/pages/*.js` names.

## 4. AC-6 boundary enforcement (eslint) + AC-3 cycle guardrail

Add **`eslint-plugin-import-x`** (flat-config native, ESLint 9 compatible) as a devDependency and wire two rule families into `packages/storybook-addon-designbook/eslint.config.js`:

1. **Boundaries** — `import-x/no-restricted-paths` with one `zones` entry per forbidden edge, keyed on the new `src/<module>/` globs, encoding the §2 DAG. Example zone (validation may not reach tools/workflow/addon):

   ```js
   'import-x/no-restricted-paths': ['error', {
     zones: [
       // validation must not touch the daemon or any tools/workflow/addon code
       { target: './src/validation', from: './src/tools' },
       { target: './src/validation', from: './src/workflow' },
       { target: './src/validation', from: './src/addon' },
       // scene-model is a leaf over shared
       { target: './src/scene-model', from: './src/validation' },
       { target: './src/scene-model', from: './src/tools' },
       { target: './src/scene-model', from: './src/workflow' },
       { target: './src/scene-model', from: './src/addon' },
       // nobody but cli.ts imports addon
       { target: './src/shared', from: './src/addon' },
       { target: './src/scene-model', from: './src/addon' },
       { target: './src/validation', from: './src/addon' },
       { target: './src/tools', from: './src/addon' },
       { target: './src/workflow', from: './src/addon' },
       // shared stays a leaf
       { target: './src/shared', from: './src/scene-model' },
       { target: './src/shared', from: './src/validation' },
       { target: './src/shared', from: './src/tools' },
       { target: './src/shared', from: './src/workflow' },
     ],
   }],
   ```

   (`cli.ts` at `src/` root matches no `target` zone, so it may import anything.)

2. **Cycles** — `import-x/no-cycle: ['error', { maxDepth: Infinity }]` over `src` (satisfies AC-3's "circular-dependency scan exits 0" and keeps it 0).

Lint stays `eslint --cache .`; `pnpm check` runs it. **AC-6 falsifiability proof** (recorded, not committed): re-adding one forbidden import (e.g. `import { StorybookDaemon } from '../tools/storybook.js'` inside `src/validation/scene.ts`) makes `pnpm lint` fail — demonstrated in coding, then reverted.

## 5. Per-AC status and the work each requires

| AC | Status vs current tree | Work in this ticket |
|---|---|---|
| **AC-1** | Real — validators import renderer | Extract `scene-model`; repoint `validation/*` at `scene-model`; `grep -rn "from '.*renderer/" src/validators`-equivalent (`src/validation`) returns nothing. |
| **AC-2** | Real — validators reach the daemon | Move the daemon-backed **inventory cross-check** (`validateSceneAgainstInventory`, the only user of `componentsIndexResolver`, **not** used by the core `validateSceneBuild`) out of `validation/scene.ts` into `tools`; validation no longer imports `resolvers/*` or `storybook.ts`. Module-graph query from each `src/validation/*.ts` shows no path to `tools/storybook.ts`. |
| **AC-3** | **Already green** (R1) | Add `import-x/no-cycle` guardrail; relocate `scene-metadata`/`buildExportName` into `scene-model` so `story-entity`'s only `renderer/` edge disappears. Scan exits 0. |
| **AC-4** | First half real, second half already green (R2) | Move `resolvers/` into `src/tools/`. `grep -rn "from '.*cli/" src/tools/inspect` returns nothing (already true; re-assert). |
| **AC-5** | **Satisfiable by keeping** (R3) | Keep all three registries (they are wired); assert every `*registry*` file has ≥1 non-test importer. No deletion. |
| **AC-6** | Real — no boundary rule exists | Add `eslint-plugin-import-x` + zones + no-cycle (§4). `pnpm check` green; forbidden import fails lint. |
| **AC-7** | Real — storybook/vite required peers | Mark `storybook` and `vite` optional in `peerDependenciesMeta`; confirm the headless paths (`workflow` incl. intake/plan stages, `validate`, `compare-images` a.k.a. "verify score") load no `storybook`/`vite`/`@ark-ui/react` (already true — those live only on the addon/build side). |
| **AC-8** | Verification obligation | §3 strategy; fixture + dist names byte-identical. |

## 6. Resolved decisions

| # | Decision | Choice | Rationale | Rejected alternative |
|---|---|---|---|---|
| **D1** | Stale findings R1–R4 | **Reconcile in spec** | Branch is stacked on 56/59; review predates it. Doing destructive work on non-existent problems risks regressions. | Return to qualification (delays a valid core); force-delete live registries (breaks `workflow.ts`). |
| **D2** | Physical layout | **Six real `src/<module>/` dirs** | Assignee choice; self-documenting boundaries; AC-8 provably safe via keyed tsup entries (§3). | eslint-zones-over-flat-layout (less legible module ownership). |
| **D3** | Registries (AC-5) | **Keep all three; assert importers** | They are live; AC-5's OR-branch ("wired to a real production caller") is met. | Delete + inline concrete impls into `workflow.ts`/`cli/workflow.ts` — larger, riskier, no AC benefit. |
| **D4** | `workflow` allowed edges | `workflow → {validation, tools, shared}` | R4: workflow orchestrates validate + resolveParams; "shared only" needs a dispatch inversion out of scope. | Force "workflow → shared only" (invasive, unbudgeted). |
| **D5** | AC-2 fix shape | **Move the inventory cross-check to `tools`** | `componentsIndexResolver` is the sole daemon path and is used only by the optional inventory check, not core scene validation. | Dependency-inject the inventory into the validator (leaks a tools concept into validation's signature). |
| **D6** | `renderer/` split | `renderer.ts` + `renderer-browser.ts` → `addon`; the node build chain → `scene-model` | Realises finding 8 (node/browser halves) and keeps the `./renderer` browser export intact. | Keep all of `renderer/` in one module (leaves validators coupled to node builders). |
| **D7** | Boundary tool | **`eslint-plugin-import-x`** | One devDep gives both `no-restricted-paths` (AC-6) and `no-cycle` (AC-3); flat-config + ESLint 9 native. | `madge` script (no in-editor feedback, second toolchain); legacy `eslint-plugin-import` (heavier, slower on flat config). |
| **D8** | `@ark-ui/react` | Out of scope beyond AC-7 note | Not imported anywhere in `src` (dead dep bundled via tsup `noExternal`); removing it is a separate cleanup, not required by AC-7's storybook/vite check. | Remove it now (scope creep, separate risk). |

## 7. Implementation plan

Ordering rationale: `scene-model` first (prerequisite for AC-1/AC-2/AC-3), then the module it unblocks, then boundaries last so the rule lands on the final layout. Every task ends `pnpm check` green and one commit. Run everything from the ticket's worktree; `pnpm install` at the worktree root first if `node_modules` is absent.

### Task 0: Tooling + baseline snapshot

**Files:** Modify `packages/storybook-addon-designbook/package.json` (devDeps), create `packages/storybook-addon-designbook/scripts/ac-checks.sh` (the AC grep/assert script the test plan reuses).

- [ ] **Step 1:** Record the AC-8 baseline: build once (`pnpm --filter storybook-addon-designbook build`), snapshot `git rev-parse HEAD:packages/integrations/test-integration-drupal/index.json` and the sorted list of `dist/pages/*.js` + `dist/components/pages/*.js` names into `scripts/ac-checks.sh` as the expected set.
- [ ] **Step 2:** Add `eslint-plugin-import-x` to `devDependencies`; `pnpm install`.
- [ ] **Step 3:** Author `scripts/ac-checks.sh` implementing every AC check from §5 as exit-coded assertions (grep-empty for AC-1/AC-4, an `import-x/no-cycle` run for AC-3, a `peerDependenciesMeta` jq check for AC-7, the dist/fixture byte-check for AC-8, a registry-importer check for AC-5).
- [ ] **Step 4:** Run `pnpm check`; commit `chore(designbook-60): add import-x + AC assertion script + AC-8 baseline`.

### Task 1: Extract `scene-model` (AC-1 prerequisite)

**Files:** Create `src/scene-model/` (move the node build chain listed in §2 out of `src/renderer/`); Modify every importer of `buildSceneModule`/`buildExportName`/`DataModel`/`readBundleFiles`/scene node types (`preset.ts`, `vite-plugin.ts`, `story-entity.ts`, `validators/*`, `renderer/index.ts`); Modify `tsup.config.ts` (keyed entries for any moved dist target) and `package.json` `bundler.*Entries`.

- [ ] **Step 1:** `git mv` the node-side files into `src/scene-model/` (keep `renderer.ts`, `renderer-browser.ts` where they are — they belong to `addon`, moved in Task 6). Move their co-located `renderer/__tests__/*` that target moved files.
- [ ] **Step 2:** Rewrite import specifiers in every consumer to `../scene-model/…`. Preserve the `loadDataModel`/`loadSampleData`/`buildRenderContext` exports `preset.ts` and `entity-module-builder` depend on.
- [ ] **Step 3:** Keep `renderer/index.ts`'s browser-safe re-exports pointing at the new `scene-model` paths where needed; ensure `./renderer` (renderer-browser) still resolves `renderComponent`/`attachDrupalBehaviors`.
- [ ] **Step 4:** `pnpm check`. Then `scripts/ac-checks.sh --ac1` (validators still import renderer at this point — expected; AC-1 fully passes after Task 3). Commit `refactor(designbook-60): extract scene-model build contract from renderer`.

### Task 2: Cut the daemon path out of validation (AC-2)

**Files:** Modify `src/validators/scene.ts` (drop `componentsIndexResolver` import + `validateSceneAgainstInventory`); Create the relocated inventory check under `src/tools/` (e.g. `tools/scene-inventory.ts`) and rewire its single caller (the scene CLI/verify path); Move `validators/__tests__/scene-inventory.test.ts` to `tools/__tests__/`.

- [ ] **Step 1:** Move `validateSceneAgainstInventory` (and its `componentsIndexResolver` use) into `src/tools/scene-inventory.ts`; `validators/scene.ts` keeps only `validateSceneBuild` (importing `buildSceneModule` from `scene-model`).
- [ ] **Step 2:** Rewire the production caller of the inventory check to the tools location; move its test.
- [ ] **Step 3:** `pnpm check`; assert a module-graph query from each `src/validators/*.ts` reaches neither `resolvers/*` nor `storybook.ts`. Commit `refactor(designbook-60): move scene-inventory daemon check out of validation (AC-2)`.

### Task 3: Move `validation` and finish AC-1

**Files:** Create `src/validation/` (`git mv src/validators/* src/validation/`, `git mv src/validation-registry.ts src/validation/registry.ts` or keep name); Modify importers (`cli.ts:4-5`, `workflow.ts:43`, dynamic imports, tests).

- [ ] **Step 1:** `git mv` `validators/` → `validation/` and `validation-registry.ts` → `validation/`; update all importers' specifiers.
- [ ] **Step 2:** `pnpm check`; run `scripts/ac-checks.sh --ac1 --ac5` — AC-1 grep (`from '.*scene-model|renderer/'` under `src/validation`) resolves only to `scene-model`, none to `renderer/`; every registry has a non-test importer. Commit `refactor(designbook-60): move validators into validation module (AC-1, AC-5)`.

### Task 4: Assemble `tools` (AC-4a) and `shared`

**Files:** Create `src/tools/` (move `resolvers/`, `inspect/`, `storybook.ts`, `reference-entity.ts`, `story-entity.ts`, `runbook/`, `sync/`, `visual-compare-path.ts`, the tool-impl `cli/*` engines, top-level `types.ts`); Create `src/shared/` (move `config*`, `constants.ts`, `logger.ts`, `log/`, `template/`, `schema-block.ts`, `skill-sources.ts`, `workflow-types.ts`, `virtual-modules.d.ts`); Modify all importers + `tsup`/`exports` values for any moved dist entry (`config`).

- [ ] **Step 1:** Move `shared/` members first (leaf); update importers.
- [ ] **Step 2:** Move `tools/` members; keep the `cli/` **command-registration** modules (`inspect-register`, `workflow`, `storybook`, `runbook`, `compare-images`) as the cli composition layer wired by `cli.ts` — move only the tool *engines* into `tools/`, or keep `cli/` as a thin registration dir importing `tools/*`. Update specifiers.
- [ ] **Step 3:** Update `tsup.config.ts` keyed entry for `config` and any moved node entry; `exports` keys unchanged.
- [ ] **Step 4:** `pnpm check`; `scripts/ac-checks.sh --ac4` (grep `from '.*cli/'` under `src/tools/inspect` empty). Commit `refactor(designbook-60): co-locate resolvers with tools; carve shared leaf (AC-4)`.

### Task 5: Assemble `workflow`

**Files:** Create `src/workflow/` (move `workflow*.ts`, `workflow-lifecycle/resolve/serialize/schema-merge/utils`, `engines/`, `scoring/`, `skill-resolver.ts`); Modify `workflow.ts` edges (`cli/submit-results-hint` → move `renderSubmitResultsHint` into `shared` or `workflow`; keep `validation-registry` and `resolvers/registry` imports — now `workflow → validation`/`workflow → tools`, allowed by §2).

- [ ] **Step 1:** `git mv` workflow cluster into `src/workflow/`; update specifiers.
- [ ] **Step 2:** Relocate `renderSubmitResultsHint` so `workflow` no longer imports `cli/` (into `shared` if pure, else `workflow`).
- [ ] **Step 3:** `pnpm check`; commit `refactor(designbook-60): assemble workflow module`.

### Task 6: Assemble `addon`; keep `cli.ts` as root

**Files:** Create `src/addon/` (move `manager*`, `preview.ts`, `preset.ts`, `vite-plugin.ts`, `renderer.ts` + `renderer-browser.ts`, `components/`, `pages/`, `decorators/`, `hooks/`, `withRoundTrip.ts`, `withVisualCompare.ts`, `use-sync-with-selector-source.ts`, `vitest-plugin-sdc.ts`, `index.ts`); Modify `tsup.config.ts` (keyed entries pinning `dist/index.js`, `dist/preview.js`, `dist/renderer-browser.js`, `dist/preset.js`, `dist/manager.js`, `dist/manager-helpers.js`, `dist/vitest-plugin-sdc.js`, and the client-bundle values); Modify `package.json` `bundler.*Entries` + `exports` values.

- [ ] **Step 1:** `git mv` the addon members into `src/addon/`; keep `cli.ts` at `src/` root.
- [ ] **Step 2:** Convert `tsup` array entries to keyed entries pinning the dist output names to the new `src/addon/…` sources; update client-bundle entry values to `src/addon/pages/…` / `src/addon/components/pages/…`.
- [ ] **Step 3:** Update `package.json` `bundler.*Entries` source paths and confirm `exports` **values** still resolve to the unchanged `dist/*` names.
- [ ] **Step 4:** `pnpm --filter storybook-addon-designbook build`; run `scripts/ac-checks.sh --ac8` — fixture `index.json` unchanged in `git diff`; `dist/pages/*` + `dist/components/pages/*` names byte-identical to the Task-0 baseline; generated literals unchanged. `pnpm check`. Commit `refactor(designbook-60): assemble addon module; pin dist entries (AC-8)`.

### Task 7: Boundary rule + cycle guardrail (AC-6, AC-3)

**Files:** Modify `packages/storybook-addon-designbook/eslint.config.js` (register `eslint-plugin-import-x`, add `no-restricted-paths` zones from §4 + `no-cycle`).

- [ ] **Step 1:** Add the plugin + `import-x/no-cycle` rule; run `pnpm lint` — must be 0 (proves AC-3 and that Tasks 1–6 introduced no cycle).
- [ ] **Step 2:** Add the `no-restricted-paths` zones encoding the §2 DAG; `pnpm lint` green.
- [ ] **Step 3:** **Falsifiability proof:** temporarily add `import { StorybookDaemon } from '../tools/storybook.js'` to `src/validation/scene.ts`; `pnpm lint` must fail on the boundary rule; revert. Record the command + observed failure in the coding handoff.
- [ ] **Step 4:** `pnpm check`; commit `feat(designbook-60): enforce module boundaries + no-cycle (AC-3, AC-6)`.

### Task 8: Optional peer deps (AC-7)

**Files:** Modify `packages/storybook-addon-designbook/package.json` (`peerDependenciesMeta`).

- [ ] **Step 1:** Add `storybook: { optional: true }` and `vite: { optional: true }` to `peerDependenciesMeta`.
- [ ] **Step 2:** Statically confirm the headless command handlers (`workflow` incl. intake/plan stages, `validate`, `compare-images`) reach no static `storybook`/`vite`/`@ark-ui/react` import (they resolve through `cli.ts` → `tools`/`workflow`/`validation`/`scene-model`/`shared`, none of which import those). Record the grep.
- [ ] **Step 3:** `pnpm check`; run `scripts/ac-checks.sh` (all ACs); commit `chore(designbook-60): mark storybook + vite optional peers (AC-7)`.

### Task 9: End-to-end smoke via debo-test

- [ ] **Step 1:** From the worktree, run one `debo-test run <suite> <case>` whose fixture exercises the CLI workflow path (a `design-*` case), to prove the restructured CLI still plans/executes end-to-end. Capture the `workflow summary --json`.
- [ ] **Step 2:** Full `pnpm check` from repo root; final commit if anything remains.

## 8. Test plan (test-type-neutral, human-confirmed)

`scenario_required = false` — no browser-visible change. Checks are static + build + one functional smoke.

| # | Type | Rationale | Command / path | Expected | Evidence (triad) |
|---|---|---|---|---|---|
| T1 | static analysis (grep) | AC-1: validation no longer imports the renderer build chain | `grep -rn "from '.*renderer/" packages/storybook-addon-designbook/src/validation` | no output, exit 1 | command · empty output · commit |
| T2 | module-graph | AC-2: no `src/validation/*.ts` reaches `tools/storybook.ts` | `import-x/no-cycle`-style graph walk in `scripts/ac-checks.sh --ac2` | no path found | command · "0 paths" · commit |
| T3 | lint (cycles) | AC-3: no import cycle in `src` | `pnpm --filter storybook-addon-designbook lint` (with `import-x/no-cycle`) | 0 cycle errors | command · lint pass · commit |
| T4 | static analysis (grep) | AC-4: no `src/tools/inspect` → `cli/` edge; `resolvers/` sits in `tools` | `grep -rn "from '.*cli/" packages/storybook-addon-designbook/src/tools/inspect` | no output, exit 1 | command · empty · commit |
| T5 | contract (importer scan) | AC-5: every `*registry*` file has ≥1 non-test importer | `scripts/ac-checks.sh --ac5` | pass for validation/resolvers/builder registries | command · pass · commit |
| T6 | lint (boundaries) | AC-6: boundary rule live + falsifiable | `pnpm check`; then reintroduce one forbidden import → `pnpm lint` fails; revert | check green; forbidden import fails lint | command · both observations · commit |
| T7 | contract (package.json) | AC-7: storybook + vite optional; headless path clean | `jq '.peerDependenciesMeta' package.json`; grep of headless handlers | both `optional:true`; no storybook/vite import on CLI path | command · values · commit |
| T8 | build canary | AC-8: dist names + fixture byte-identical | `pnpm build`; `git diff --stat` on the fixture; compare `dist/pages/*`+`dist/components/pages/*` to Task-0 baseline | no diff; names identical | command · clean diff · commit |
| T9 | functional smoke | the restructured CLI still runs a real workflow end-to-end | `debo-test run <suite> <case>` from the worktree | `workflow summary` OK | command · summary json · commit |
| T10 | full gate | overall regression gate | `pnpm check` (typecheck → lint → test) from repo root | exit 0 | command · exit 0 · commit |

**Human confirmation required before coding:** confirm (a) the reconcile of R1–R4, (b) the six-directory layout + refined DAG, (c) that the AC-8 canary (fixture + dist-name byte-identity) is the accepted proof, and (d) the debo-test suite/case for T9.

## 9. Risks

- **Big-bang churn.** ~380 files relocate across six modules. Mitigation: strict task ordering (scene-model → validation → tools/shared → workflow → addon → rules), `pnpm check` + AC script green per task, one commit per task for bisectability.
- **AC-8 dist drift.** A missed tsup entry key or `exports` value would silently change a `dist/*` path. Mitigation: Task-0 baseline + Task-6 canary compare; the single fixture `index.json` is the tripwire.
- **`renderer/` node/browser split.** The build chain must move to `scene-model` without moving `renderer.ts`/`renderer-browser.ts`; the `./renderer` export and `renderComponent` re-export must keep resolving. Mitigation: Task 1 keeps the browser runtime in place, Task 6 moves it into `addon` with the export value re-pinned.
- **Reconciliation misread as scope-drop.** R1–R4 mean AC-3/AC-4b/AC-5 are largely verify-not-build. Mitigation: this spec records the evidence; the AC script proves each check regardless.
