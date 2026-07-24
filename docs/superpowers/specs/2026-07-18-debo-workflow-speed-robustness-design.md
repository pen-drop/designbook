# DESIGNBOOK-15 — debo workflow speed + robustness

Fix engine blockers and sharpen skills to eliminate measured waste in the
`debo-test run drupal-web design-shell` flow. Baseline (DESIGNBOOK-13 run): ~132 min active
agent time, ~95% of it LLM round-trip latency, a large share spent on avoidable friction —
three engine bugs forcing manual workarounds every fresh run, one skill rule firing one task
too late, per-run re-improvisation of the same helper scripts.

**Target:** ≥40% active-run-time reduction and zero manual workarounds on a fresh run.

## Scope decisions (agreed in spec)

- **M8 included** — full M1–M8 in one coding pass.
- **M3 = skip the enum constraint for result validation at pre-component stages** (not the
  union-enum variant). Narrowest change that keeps validation on elsewhere.
- **M4 = all three fixes**, including the new `workflow archive --workflow <id>` recovery command.
- **M5 = addon CLI subcommands wherever feasible** (not loose skill-resource scripts). Package as
  much as possible into `storybook-addon-designbook`; a loose script is only a fallback when a helper
  genuinely cannot live in the addon.

## Phase 1 — Engine/CLI blockers (M1–M4)

Every fresh-workspace run hits these; they force manual recovery by the driving agent.

### M1 — `workflow create` cannot resolve skills from the theme dir

Resolver picks `~/.agents/skills/…` instead of the workspace `.agents` when run from the theme dir
(where `debo-test`'s `run.md` runs all CLI commands). Two belts:

1. `scripts/setup-workspace.sh` — after the existing symlink block, also
   `ln -sfn "$REPO_ROOT/.agents" "$THEME_DIR/.agents"`.
2. Addon skill resolver (grep `skills/**/workflows`) — anchor resolution on `configDir` (the dir of
   the found `designbook.config.yml`, which already walks up) before falling back to cwd and
   `$HOME/.agents`, so any subdirectory of a configured workspace works.

**Verify:** fresh workspace rebuild, then from the theme dir
`npx storybook-addon-designbook workflow list --workflow design-shell` lists the workflow with **no**
symlink hack.

### M2 — `scenes-constraints` rule triggers one task too late

Scene file content is authored in `create-scene-file`, but the rule's trigger is
`steps: [create-scene, map-entity]`, so the constraint arrives after the file exists. Load
`designbook-skill-creator` first, then:

1. Add `create-scene-file` to the trigger `steps` in
   `.agents/skills/designbook/design/rules/scenes-constraints.md`.
2. Audit siblings `shell-scene-constraints.md`, `screen-scene-constraints.md`; add `create-scene-file`
   where the constraint is needed at scene-file authoring.

**Verify:** `workflow create` on a scratch workspace → `create-scene-file` lists `scenes-constraints.md`
under `rules` in `stage_loaded` (AC-3).

### M3 — `injectComponentsEnum` rejects components planned at intake

`ComponentNode.component` enum is injected from the live Storybook index (fresh workspace = `card` +
`plain` only), so an intake planning new components can never validate. **Chosen fix: skip the injected
component-enum constraint for result validation at stages that run before the component stage** — the
narrower change; do not loosen schema validation anywhere else. Extend
`src/__tests__/workflow-resolve-components-enum.test.ts` with a "planned-but-not-yet-indexed component
ids are accepted at pre-component stages" case.

Anchor points: `src/workflow-resolve.ts:479` + `:366`, impl `src/workflow-resolve-components-enum.ts`,
plus the result-validation path applied on `workflow done`.

**Verify:** fresh workspace design-shell run passes intake `workflow done` with 10+ new component ids,
**no** `tasks.yml` hand-edit; `pnpm check` green.

### M4 — After-hook lifecycle is brittle (3 fixes)

`after-workflow 'design-verify': param 'story_id' … evaluated to undefined` — the expression resolves
at create-time, before the story exists; the manual `--parent` child never called `registerChild`, so
`cascadeParent` never fired and the parent stayed `awaiting-after`.

1. `src/cli/workflow.ts` `createAfterWorkflows` (entry :413, invoked :718) — resolve after-workflow
   param expressions **lazily at hook time** against the parent's final state (incl. result data like
   `story_url`/`story_id`). If a param still cannot resolve at hook time, surface a clear error listing
   the missing key — never silently skip.
2. `runWorkflowCreate` — when `--parent` is passed, call `registerChild` (idempotent; pinned by
   `workflow-after-create.test.ts:166`).
3. New recovery command `workflow archive --workflow <id>` — force-archive with summary, mirroring
   `cascadeParent`'s archive step, so stuck `awaiting-after` parents have a supported recovery path.
4. Extend `src/cli/__tests__/workflow-after-create.test.ts`: (a) after-hook param that only exists after
   the parent run; (b) `--parent` create registers the child and cascades archival.

**Verify:** end-to-end scratch run — design-shell → design-verify auto-created with resolved `story_id`;
both archive automatically; `workflow summary --json` works without manual intervention (AC-2).

## Phase 2 — Skill sharpening (M5–M7)

### M5 — Package helpers as addon CLI subcommands (not per-run improvisation)

Ship the recurring helpers **into the addon** wherever feasible (TypeScript, vitest-covered,
versioned), and reference the resulting command from the matching task/rule. Feasibility gate: if the
addon already has the command surface + deps (esp. Playwright), it becomes a subcommand; a loose skill
resource script is only a fallback. Load `designbook-skill-creator` before editing any skill file.

| Helper | Purpose | Home |
|--------|---------|------|
| `batch-done` | loop `workflow done` over `each`-expanded component tasks, reading each result JSON from a dir | **Addon** — wraps existing `workflow done`; pure Node/TS, no browser |
| `extract-page` | one Playwright pass → landmarks/regions, interactive+behavior candidates, forms, images/asset URLs, `@font-face`, colors → `extract.json` skeleton on disk | **Addon** if Playwright command infra exists (plan greps); else loose `resources/extract-page.js` |
| `capture-matrix` | read `meta.yml`+`design-tokens.yml`, resolve breakpoint widths, capture element×state×breakpoint matrix in one Playwright session, reuse frozen PNGs | **Addon** (same feasibility gate); else `resources/capture-matrix.sh` |
| `check-story` | validate preflight: staleness check → restart, goto story, console-error scan, `document.fonts.check`, behavior smoke (click, assert `aria-expanded`/panel) | **Addon** (same gate); else `resources/check-story.sh` |

References: `extract-page` ← `design/tasks/extract-reference.md`; `capture-matrix` ←
`design/tasks/ensure-baseline.md` + `capture-storybook.md` (or `playwright-capture` rule); `check-story`
← `design/tasks/validate.md` / `playwright-validate.md`; `batch-done` ← the component-stage docs in
`resources/workflow-execution.md`.

**Verify:** fresh run, LLM calls per stage window from the wire log — extract ≤ 15, baseline stage ≤ 10,
validate ≤ 20 (AC-5). New addon commands covered by vitest (AC-6).

### M6 — Context-hygiene rule for extraction/capture

Cache-read tokens grew 1.0M → 11.4M across the run; big page/style/a11y dumps in the conversation are
the driver. Add to `.agents/skills/designbook/design/rules/playwright-capture.md` (referenced from
`extract-reference.md`): all raw DOM/style/accessibility dumps MUST be written to files and queried with
`jq`/`python3`/grep; only the distilled result enters the conversation. Snapshots, full stylesheets, and
`extract.json` itself are never pasted.

### M7 — Document the `story_url` resolve failure + recovery

In `design/tasks/validate.md` (or wherever the constraint lives after M2): when `story_url` resolution
fails after components were created in the same run, pass the URL explicitly
(`http://localhost:<port>/iframe.html?id=<scene-story-id>&viewMode=story`) in the stage result / via
`--data`, instead of debugging the resolver. Resolver lag noted as a known gap, out of scope.

## Phase 3 — Harness (M8, included)

### M8 — `debo-test run`: per-stage driver subagents

The forced-inline single driver accumulates ~170k tokens/request by run end. In
`.agents/skills/designbook-test/workflows/run.md`: the main loop dispatches one fresh subagent **per
stage** (sequential), each resuming the on-disk workflow via `workflow instructions --stage <name>`;
the `needs_user`/`done` contract stays per stage. Keep single-driver mode behind a debug flag. Fix the
dispatch-prompt wording: the skill's preflight **mandates** storybook restarts when component files are
newer — the driver prompt must not forbid them.

**Verify:** two fresh runs (single-driver vs per-stage), compare active wall time and per-request context
size from the wire logs.

## Out of scope

- The xl-footer visual diff (10.7%) — fixture polish, not tooling.
- A `workflow done` batch **API** in the engine — `batch-done` ships the command-level workaround first;
  engine API can follow if it proves the pattern.

## Acceptance criteria

- **AC-1** — fresh `debo-test run drupal-web design-shell` completes with zero manual workarounds (no
  `.agents` symlink hack, no `tasks.yml` enum patch, no manual archival cascade).
- **AC-2** — design-shell → design-verify after-hook auto-creates child with resolved `story_id`; parent
  auto-archives; `workflow summary --json` available immediately.
- **AC-3** — `create-scene-file` loads `scenes-constraints.md` (visible in `stage_loaded`).
- **AC-4** — active run time ≤ 60% of baseline (~132 min), measured per protocol.
- **AC-5** — LLM-call budgets: extract-reference ≤ 15, ensure-baseline stage ≤ 10, validate ≤ 20.
- **AC-6** — `pnpm check` green, incl. new/extended vitest (M3, M4, new M5 addon commands).

## Verification protocol (re-measurement)

1. `rm -rf workspaces/drupal-web && ./scripts/setup-workspace.sh drupal-web && ./scripts/setup-test.sh drupal-web design-shell --into workspaces/drupal-web`
2. Run `/debo-test run drupal-web design-shell` end-to-end.
3. Locate driver wire logs under `~/.kimi-code/sessions/wd_designbook_*/agents/agent-*/wire.jsonl` (newest).
4. Pair `llm.request`→`usage.record` (LLM time/calls), `tool.call`→`tool.result` by `toolCallId` (tool
   time); bucket calls between stage boundaries from archive `tasks.yml`. Recreate the ~60-line stdlib
   `analyze-wire.py` if gone.
5. Compare against baseline; record both runs' numbers in the closing comment.

**Note (coding-state policy):** skill changes are verified through the matching `debo-test` tester,
never ad-hoc. Run the tester from a **plain checkout, not inside this git worktree** — its setup scripts
do `git reset --hard`/`git clean -fd` and assume the theme dir is its own git repo.
