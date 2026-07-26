# debo workflow speed + robustness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the measured waste in `debo-test run drupal-web design-shell` — fix the fresh-run engine/CLI blockers, sharpen the skills, and split the driver per stage — so a fresh run completes with zero manual workarounds in ≤60% of the ~132-min baseline.

**Architecture:** Three phases. Phase 1 (M1–M4) fixes the addon TS engine + setup script that force manual recovery every fresh run. Phase 2 (M5–M7) packages the recurring helper scripts into the addon as CLI subcommands, fixes a rule trigger, and adds context-hygiene rules. Phase 3 (M8) restructures the `debo-test` driver into per-stage subagents. Verification is a full re-measurement run compared to the wire-log baseline.

**Tech Stack:** TypeScript (`packages/storybook-addon-designbook`, vitest), bash (`scripts/`), Playwright (addon CLI capture commands), Markdown skill files under `.agents/skills/designbook*` (authored via `designbook-skill-creator`).

## Global Constraints

- **Verify with `pnpm check`** (typecheck → lint → test, fail-fast) before every commit that touches the addon/TS. Auto-fix: `pnpm --filter storybook-addon-designbook lint:fix`.
- **No compat/migration code** — existing on-disk artifacts (`meta.yml`, `tasks.yml`, generated output) are disposable; update writer/reader to the new shape, never read/upgrade old artifacts.
- **Skill files first load `designbook-skill-creator`** — before creating OR editing any task/rule/blueprint/workflow/schemas.yml under `.agents/skills/designbook/`, `.agents/skills/designbook-*/`. Load the matching per-file-type rule (rules/task-files.md, rules/rule-files.md, etc.) + rules/common-rules.md. WHAT (task) vs HOW split; rules are hard constraints; schemas are single-source.
- **Core stays backend-neutral** — Drupal/drush specifics live in the integration skill as command strings + config, no new backend code in core.
- **Schema-first** — prefer enums/required/validators in schemas over imperative rules.
- **M3 chosen fork:** skip the injected component-enum constraint for **result validation at pre-component stages** only. Do NOT loosen schema validation anywhere else, and do NOT use the union-enum variant.
  - **As-built deviation (confirmed intentional, commit `36de6809`):** the enum module was removed entirely instead of being gated per stage. Component existence is now validated at done-time by the `scene` validator's live-index walk (`validateSceneAgainstInventory`), which avoids false-rejecting components created during the same run. Consequence: `ComponentNode.component` in **data** results without a scene validator (e.g. canvas sample-data records) has no component-existence validation.
- **M5 chosen form:** package helpers as **addon CLI subcommands** (vitest-covered) wherever feasible; a loose skill-resource script is only a fallback when a helper genuinely cannot live in the addon.
- **debo-test tester runs from a plain checkout, NOT inside this git worktree** — its setup scripts do `git reset --hard` / `git clean -fd` and assume the theme dir is its own git repo.
- **Touch component files after creation** to defeat the Storybook watcher race; restart Storybook with `npx addon start --force`.

---

## Phase 1 — Engine/CLI blockers

### Task 1: M1 — skill resolver anchors on configDir + theme-dir symlink

**Files:**
- Modify: `scripts/setup-workspace.sh` (after the existing `.agents` symlink block, ~lines 144–147)
- Modify: addon skill resolver — locate via `grep -rn "skills/\*\*/workflows" packages/storybook-addon-designbook/src`
- Test: `packages/storybook-addon-designbook/src/__tests__/` (resolver test — match the existing test file for the resolver module)

**Interfaces:**
- Produces: skill resolution that anchors on `configDir` (the dir of the found `designbook.config.yml`, which already walks up) **before** falling back to cwd and `$HOME/.agents`.

- [ ] **Step 1: Locate the resolver + its config-dir walk-up.** `grep -rn "skills/\*\*/workflows\|\.agents\|configDir\|designbook.config" packages/storybook-addon-designbook/src`. Identify where the workflow file is resolved and where `designbook.config.yml` is discovered (the walk-up).
- [ ] **Step 2: Write the failing test.** In the resolver's test file, add a case: given a workspace whose `configDir` contains `.agents/skills/**/workflows/design-shell.md`, and a cwd that is a **subdirectory** (the theme dir) with a competing `$HOME/.agents`, `resolveWorkflow('design-shell')` returns the workspace path, not the home path.
- [ ] **Step 3: Run it, verify it fails.** `pnpm --filter storybook-addon-designbook test -- <resolver test file>` → FAIL.
- [ ] **Step 4: Implement.** Make resolution try `configDir/.agents` first, then cwd, then `$HOME/.agents`.
- [ ] **Step 5: Run, verify pass.** Same command → PASS.
- [ ] **Step 6: Setup-workspace symlink.** In `scripts/setup-workspace.sh`, right after the existing symlink block, add `ln -sfn "$REPO_ROOT/.agents" "$THEME_DIR/.agents"` (confirm `$REPO_ROOT` / `$THEME_DIR` var names match the script; adapt).
- [ ] **Step 7: E2E verify.** `rm -rf workspaces/drupal-web && ./scripts/setup-workspace.sh drupal-web && ./scripts/setup-test.sh drupal-web design-shell --into workspaces/drupal-web`, then from the theme dir `npx storybook-addon-designbook workflow list --workflow design-shell` lists it with **no** manual symlink. (Run from a plain checkout, not this worktree.)
- [ ] **Step 8: `pnpm check` green, commit.**

### Task 2: M3 — skip component-enum constraint at pre-component stages

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts` (~`:366`, `:479`) and the result-validation path applied on `workflow done`
- Impl reference: `packages/storybook-addon-designbook/src/workflow-resolve-components-enum.ts`
- Test: `packages/storybook-addon-designbook/src/__tests__/workflow-resolve-components-enum.test.ts`

**Interfaces:**
- Produces: for **result validation** at stages **before** the component stage, the `ComponentNode.component` enum constraint is not applied; at/after the component stage it is unchanged.

- [ ] **Step 1: Read the code.** Read `workflow-resolve.ts:340-500` and `workflow-resolve-components-enum.ts` to find where the enum is injected and where result validation runs; identify how the current stage relative to the component stage is known.
- [ ] **Step 2: Write the failing test.** In `workflow-resolve-components-enum.test.ts`: an intake-stage (pre-component) result declaring 10+ component ids absent from the live index (index = `card`, `plain`) validates **successfully**; a component-stage result with an unknown component id still **fails**.
- [ ] **Step 3: Run it, verify it fails.** `pnpm --filter storybook-addon-designbook test -- workflow-resolve-components-enum` → FAIL.
- [ ] **Step 4: Implement.** Gate the enum injection/application for the result-validation path on "stage is at or after the component stage". Keep param/schema validation elsewhere untouched.
- [ ] **Step 5: Run, verify pass.** Same command → PASS.
- [ ] **Step 6: E2E verify.** Fresh workspace design-shell run passes intake `workflow done` with 10+ new component ids and **no** `tasks.yml` hand-edit.
- [ ] **Step 7: `pnpm check` green, commit.**

### Task 3: M4 — after-hook lazy param resolve + registerChild on --parent

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts` — `createAfterWorkflows` (entry ~`:413`, invoked ~`:718`) and `runWorkflowCreate`
- Reference: `packages/storybook-addon-designbook/src/workflow.ts` — `registerChild`, `cascadeParent` (~`:284`)
- Test: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-after-create.test.ts` (idempotency pinned at `:166`)

**Interfaces:**
- Consumes: parent final state incl. result data (`story_url`, `story_id`).
- Produces: after-workflow params resolved lazily at hook time; `--parent` create calls `registerChild`.

- [ ] **Step 1: Read the code.** Read `cli/workflow.ts` around `createAfterWorkflows`, `runWorkflowCreate`, and `workflow.ts` `registerChild`/`cascadeParent` to learn the exact signatures + when params are currently resolved.
- [ ] **Step 2: Write failing test (a).** After-hook param whose expression (`story_id`) only resolves after the parent run completes and produces result data → the child is created with the resolved value. If unresolvable at hook time, a clear error lists the missing key (assert the message).
- [ ] **Step 3: Write failing test (b).** `runWorkflowCreate` with `--parent` registers the child so `cascadeParent` fires and the parent archives; re-running is idempotent (extend from `:166`).
- [ ] **Step 4: Run, verify both fail.** `pnpm --filter storybook-addon-designbook test -- workflow-after-create` → FAIL.
- [ ] **Step 5: Implement lazy resolution.** In `createAfterWorkflows`, resolve param expressions against the parent's **final** state at hook time (not create-time). On failure, throw an error naming the missing key — never silently skip.
- [ ] **Step 6: Implement registerChild-on-parent.** In `runWorkflowCreate`, when `--parent` is passed, call `registerChild` idempotently.
- [ ] **Step 7: Run, verify pass.** Same command → PASS.
- [ ] **Step 8: `pnpm check` green, commit.**

### Task 4: M4 — `workflow archive --workflow <id>` recovery command

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts` (register the `archive` subcommand)
- Reference: `packages/storybook-addon-designbook/src/workflow.ts` — `cascadeParent`'s archive step (~`:284`)
- Test: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-after-create.test.ts` (or a sibling cli test)

**Interfaces:**
- Produces: `workflow archive --workflow <id>` — force-archive with summary, mirroring `cascadeParent`'s archive step, for stuck `awaiting-after` parents.

- [ ] **Step 1: Write the failing test.** A parent stuck in `awaiting-after` → `workflow archive --workflow <id>` moves it to `archive/` with a summary; `workflow summary --json` then works.
- [ ] **Step 2: Run it, verify it fails.** `pnpm --filter storybook-addon-designbook test -- workflow-after-create` → FAIL (command not found / unhandled).
- [ ] **Step 3: Implement.** Add the `archive` subcommand reusing the archive step logic from `cascadeParent` (extract a shared helper if it is currently inlined — DRY).
- [ ] **Step 4: Run, verify pass.** Same command → PASS.
- [ ] **Step 5: E2E verify (with Task 3).** Scratch run: design-shell → design-verify auto-created with resolved `story_id`; both archive automatically; `workflow summary --json` works with no manual intervention (AC-2).
- [ ] **Step 6: `pnpm check` green, commit.**

---

## Phase 2 — Skill sharpening

> Load `designbook-skill-creator` (+ the matching per-file-type rule and common-rules.md) before touching any `.agents/skills/**` file. Addon commands below are ordinary TS/vitest work (no skill-creator needed for the `.ts`), but the skill task/rule that *references* the command IS a skill-file edit.

### Task 5: M5 — `workflow batch-done` addon command

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts` (register `batch-done`)
- Create: impl module if the command is non-trivial (e.g. `src/cli/workflow-batch-done.ts`)
- Modify skill: `.agents/skills/designbook/resources/workflow-execution.md` (reference the command from the component stage)
- Test: `packages/storybook-addon-designbook/src/cli/__tests__/` (new `workflow-batch-done.test.ts`)

**Interfaces:**
- Produces: `workflow batch-done --dir <dir>` (or `workflow done --batch <dir>`) — loops `workflow done` over the run's `each`-expanded component tasks, reading each task's result JSON from a directory; reports per-task pass/fail, non-zero exit on any failure.

- [ ] **Step 1: Read `workflow done`.** Find the existing `workflow done` handler in `cli/workflow.ts`; note how one result JSON is submitted so batch reuses it (DRY, no duplicated submit logic).
- [ ] **Step 2: Write the failing test.** Given a dir of N result JSON files, `batch-done` submits each via the same path as `workflow done`, aggregates results, and exits non-zero if any fails.
- [ ] **Step 3: Run it, verify it fails.** `pnpm --filter storybook-addon-designbook test -- workflow-batch-done` → FAIL.
- [ ] **Step 4: Implement.** Iterate the dir, call the shared submit helper per file, collect outcomes.
- [ ] **Step 5: Run, verify pass.** Same command → PASS.
- [ ] **Step 6: Reference from skill.** With `designbook-skill-creator` loaded, add the command to the component-stage docs in `resources/workflow-execution.md` ("submit all component results with `workflow batch-done --dir <dir>`").
- [ ] **Step 7: `pnpm check` green, commit.**

### Task 6: M5 — Playwright capture/extract commands (feasibility-gated)

**Files:**
- Investigate: `grep -rn "playwright\|chromium\|run-code\|browser" packages/storybook-addon-designbook/src` to decide addon-command vs loose-script per helper
- Modify (addon path): `src/cli/` new commands `extract-page`, `capture-matrix`, `check-story` (+ impl modules)
- Fallback (loose path): `.agents/skills/designbook/resources/extract-page.js`, `capture-matrix.sh`, `check-story.sh`
- Modify skills: `design/tasks/extract-reference.md`, `design/tasks/ensure-baseline.md` + `design/tasks/capture-storybook.md` (or `design/rules/playwright-capture.md`), `design/tasks/validate.md` / `design/rules/playwright-validate.md`
- Test: vitest per addon command created

**Interfaces:**
- Produces (whichever home): `extract-page` (one Playwright pass → landmarks/regions, interactive+behavior candidates, forms, images/asset URLs, `@font-face`, colors → `extract.json`); `capture-matrix` (read `meta.yml`+`design-tokens.yml`, resolve breakpoint widths, capture element×state×breakpoint matrix in one session, reuse frozen PNGs); `check-story` (staleness check→restart, goto story, console-error scan, `document.fonts.check`, behavior smoke).

- [ ] **Step 1: Feasibility gate.** Run the grep. If the addon already has a Playwright command surface + deps → implement as addon subcommands. If not → ship as loose skill-resource scripts and note in the ticket why (document the decision). Decide per helper.
- [ ] **Step 2 (addon path): TDD each command.** For each: write a failing vitest exercising its pure logic (arg parsing, breakpoint resolution from tokens, extract.json shape) with Playwright mocked/stubbed → implement → pass. (Browser I/O is smoke-verified in the E2E run, unit-tested at the seams.)
- [ ] **Step 2 (loose path): author the script** with `designbook-skill-creator` loaded (resource file rules).
- [ ] **Step 3: Reference from the tasks/rules** — `extract-page` ← `extract-reference.md` ("run this first, then fill gaps"); `capture-matrix` ← `ensure-baseline.md` + `capture-storybook.md`; `check-story` ← `validate.md` / `playwright-validate.md`.
- [ ] **Step 4: `pnpm check` green (if addon), commit.**
- [ ] **Step 5: Budget verify (deferred to final run).** extract-reference ≤ 15 calls, baseline stage ≤ 10, validate ≤ 20 (AC-5).

### Task 7: M2 — `scenes-constraints` trigger fires at create-scene-file

**Files:**
- Modify: `.agents/skills/designbook/design/rules/scenes-constraints.md` (frontmatter `steps`)
- Audit/modify: `.agents/skills/designbook/design/rules/shell-scene-constraints.md`, `screen-scene-constraints.md`

- [ ] **Step 1: Load `designbook-skill-creator`** + rules/rule-files.md + common-rules.md.
- [ ] **Step 2: Add `create-scene-file`** to the trigger `steps` list in `scenes-constraints.md`.
- [ ] **Step 3: Audit siblings.** If `shell-scene-constraints.md` / `screen-scene-constraints.md` constraints are needed when scene files are authored, add `create-scene-file` there too.
- [ ] **Step 4: Verify.** `workflow create --workflow design-shell …` on a scratch workspace → inspect `stage_loaded` in `tasks.yml`: `create-scene-file` lists `scenes-constraints.md` under `rules` (AC-3).
- [ ] **Step 5: Commit.**

### Task 8: M6 — context-hygiene rule + M7 story_url recovery doc

**Files:**
- Modify: `.agents/skills/designbook/design/rules/playwright-capture.md` (M6)
- Modify: `.agents/skills/designbook/design/tasks/extract-reference.md` (reference M6 rule)
- Modify: `.agents/skills/designbook/design/tasks/validate.md` (M7; or the post-M2 home of the scene constraint)

- [ ] **Step 1: Load `designbook-skill-creator`** + rules/rule-files.md + rules/task-files.md + common-rules.md.
- [ ] **Step 2: M6 rule.** In `playwright-capture.md`: all raw DOM/style/accessibility dumps MUST be written to files (workspace tmp or `/tmp`) and queried with `jq`/`python3`/grep; only the distilled result enters the conversation; snapshots, full stylesheets, and `extract.json` are never pasted. Reference it from `extract-reference.md`.
- [ ] **Step 3: M7 doc.** In `validate.md`: when `story_url` resolution fails after same-run component creation, pass the URL explicitly `http://localhost:<port>/iframe.html?id=<scene-story-id>&viewMode=story` in the stage result / via `--data`; note the resolver lag as a known out-of-scope gap.
- [ ] **Step 4: Commit.**

---

## Phase 3 — Harness

### Task 9: M8 — `debo-test run` per-stage driver subagents

**Files:**
- Modify: `.agents/skills/designbook-test/workflows/run.md`

- [ ] **Step 1: Load `designbook-skill-creator`** + rules/workflow-files.md + common-rules.md.
- [ ] **Step 2: Read current run.md** to find the "one driver runs everything inline (including `isolate: true` stages)" instruction and the dispatch-prompt wording.
- [ ] **Step 3: Rewrite the driver model.** Main loop dispatches one fresh subagent **per stage** (sequential); each resumes the on-disk workflow via `workflow instructions --stage <name>`; the `needs_user`/`done` contract stays per stage. Keep single-driver mode behind a debug flag.
- [ ] **Step 4: Fix the dispatch prompt.** The skill's preflight **mandates** storybook restarts when component files are newer — the driver prompt must not forbid them.
- [ ] **Step 5: Verify.** Two fresh runs (single-driver flag vs per-stage), compare active wall time + per-request context size from the wire logs.
- [ ] **Step 6: Commit.**

---

## Phase 4 — Acceptance re-measurement

### Task 10: Full re-measurement run + closing numbers

**Files:**
- Create (if gone): `analyze-wire.py` (~60 lines, stdlib only)

- [ ] **Step 1: Rebuild workspace.** From a **plain checkout (not this worktree)**: `rm -rf workspaces/drupal-web && ./scripts/setup-workspace.sh drupal-web && ./scripts/setup-test.sh drupal-web design-shell --into workspaces/drupal-web`.
- [ ] **Step 2: Run end-to-end.** `/debo-test run drupal-web design-shell`.
- [ ] **Step 3: Locate wire logs.** `~/.kimi-code/sessions/wd_designbook_*/agents/agent-*/wire.jsonl` (newest session).
- [ ] **Step 4: Analyze.** Recreate `analyze-wire.py` if gone; pair `llm.request`→`usage.record` (LLM time/calls), `tool.call`→`tool.result` by `toolCallId` (tool time); bucket by stage boundaries from archive `tasks.yml`.
- [ ] **Step 5: Assert ACs.** AC-1 zero manual workarounds; AC-2 auto-cascade + `workflow summary --json`; AC-3 rule loaded; AC-4 ≤60% of ~132 min; AC-5 call budgets; AC-6 `pnpm check` green.
- [ ] **Step 6: Record both runs' numbers** in the ticket closing comment.

---

## Self-Review

**Spec coverage:** M1→Task 1; M2→Task 7; M3→Task 2; M4→Tasks 3+4; M5→Tasks 5+6; M6→Task 8; M7→Task 8; M8→Task 9; verification protocol + all 6 ACs→Task 10. All measures covered.

**Placeholder scan:** No TBD/TODO. Exact file paths + anchors from the ticket throughout. The only deliberate branch (Task 6 feasibility gate) is a decision step with both paths specified, not a placeholder.

**Type consistency:** `registerChild`/`cascadeParent` names consistent (Tasks 3, 4). `workflow batch-done` / `workflow archive` command names consistent across plan + spec. M3 "skip at pre-component stages" consistent with the chosen fork.

**Sequencing note:** Tasks 3 and 4 share `cascadeParent` archive logic — do Task 3 first, extract the shared archive helper in Task 4. Task 6's budget assertion (AC-5) and Tasks 1–9's E2E checks all fold into Task 10's single measured run.
