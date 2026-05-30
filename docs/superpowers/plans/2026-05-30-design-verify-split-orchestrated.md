# design-verify Split + Subagent Orchestration + Scores in Result (Plan 2 of 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `design-verify` into composable `verify-capture` (measure) and `verify-fix` (fix) sub-workflows, keep `design-verify` as a thin orchestrator that runs them in subagents (capture → fix → capture), and surface `first_shot`/`final` fidelity scores in the workflow result.

**Architecture:** Skill-only, on top of Plan 1. `verify-capture`'s outtake emits a `VerifyResult` (score + pixel diff + per-check breakdown) via `workflow done --data` — which lands in `scope.workflow_output` and is shown by the existing `result` command. `design-verify` becomes an orchestrator whose body dispatches one subagent per sub-workflow run and aggregates the two `VerifyResult`s into a `ScoreReport`. No new engine code except extending `workflow-summary.ts` to print the score fields.

**Tech Stack:** designbook skill files (workflows/tasks/schemas — author via `designbook-skill-creator`), one addon edit to `workflow-summary.ts` (vitest).

**Spec:** `docs/superpowers/specs/2026-05-30-firstshot-score-responsive-capture-design.md` (Features 3, 4). Depends on Plan 1 (`computeFidelityScore`, `PropertyNode.overrides`).

**Mechanism note:** the outtake (last) task's `--data` results land in `scope.workflow_output`; the existing `workflow result` command (workflow-summary.ts) reads and prints `workflow_output`. So "score in the result" needs only: outtake declares the score keys + submits them. The 3/2/1 formula is applied in the outtake per the fixed formula (mirrors the reference helper `computeFidelityScore`).

---

## File Structure

```
.agents/skills/designbook/design/
  schemas.yml                              # + VerifyResult, ScoreReport
  workflows/verify-capture.md              # NEW
  workflows/verify-fix.md                  # NEW
  workflows/design-verify.md               # refactor → orchestrator (reference + orchestrate + outtake)
  tasks/outtake--verify-capture.md         # NEW (emits VerifyResult)
  tasks/orchestrate--design-verify.md      # NEW (dispatch subagents capture/fix/capture)
  tasks/outtake--design-verify.md          # rewrite (aggregate → ScoreReport)
  rules/region-properties.md               # + consume overrides → responsive (mobile-first)
.agents/skills/designbook-css-tailwind/rules/region-properties.md  # + responsive prefixes
.agents/skills/designbook-drupal/components/rules/region-properties.md  # (unchanged unless needed)
packages/storybook-addon-designbook/src/cli/workflow-summary.ts     # print first_shot/final/delta
packages/storybook-addon-designbook/src/cli/__tests__/workflow-summary.test.ts  # + score print test
```

**ALL skill-file tasks below: invoke `designbook-skill-creator` first and load the matching rule (`schema-files.md` / `workflow-files.md` / `task-files.md` / `rule-files.md`) + `common-rules.md` before editing.**

---

## Task 1: Schemas — `VerifyResult` + `ScoreReport`

**Files:** Modify `.agents/skills/designbook/design/schemas.yml`

- [ ] **Step 1: Load `designbook-skill-creator` + `rules/schema-files.md` + `rules/common-rules.md`.**

- [ ] **Step 2: Add both types** (near the existing `CompareArtifact` / `Issue` types). Use the exact shapes from the spec:

```yaml
VerifyResult:
  type: object
  title: Verify Result
  description: >
    One verify-capture run's measurement. `score` is the severity sum
    (critical×3 + major×2 + minor×1) over all checks — lower is better,
    0 = perfect. Pixel diff and per-check breakdown sit alongside so callers
    see both structural and visual fidelity.
  required: [score, checks]
  properties:
    score: { type: integer, minimum: 0, examples: [17],
      description: "Σ(critical×3 + major×2 + minor×1) over all checks. 0 = perfect." }
    avg_diff_percent: { type: number, examples: [0.21], description: Mean pixel deviation ratio across checks. }
    max_diff_percent: { type: number, examples: [0.44], description: Worst-case pixel deviation across checks. }
    passed: { type: integer, examples: [2], description: Checks that passed their threshold. }
    total:  { type: integer, examples: [4], description: Total checks. }
    issues:
      type: object
      description: Aggregate issue counts by severity over all checks.
      properties:
        critical: { type: integer, examples: [2] }
        major:    { type: integer, examples: [4] }
        minor:    { type: integer, examples: [3] }
    checks:
      type: array
      description: Per-check breakdown (one per breakpoint × region).
      items:
        type: object
        required: [breakpoint, region, score, passed]
        properties:
          breakpoint:   { $ref: "#/BreakpointId" }
          region:       { $ref: "#/RegionId" }
          score:        { type: integer, minimum: 0 }
          passed:       { type: boolean }
          diff_percent: { type: number }
          critical:     { type: integer }
          major:        { type: integer }
          minor:        { type: integer }
    tokens:
      type: object
      description: This run's agent-reported LLM tokens. Best-effort; absent on headless runs.
      properties: { input: { type: integer }, output: { type: integer } }

ScoreReport:
  type: object
  title: Score Report
  description: >
    A design-verify run: first_shot (before any fix) and final (after the
    single verify-fix pass), each a full VerifyResult. delta = first_shot.score
    − final.score (positive = improvement; lower score is better).
  required: [first_shot, final, delta]
  properties:
    first_shot: { $ref: "#/VerifyResult" }
    final:      { $ref: "#/VerifyResult" }
    delta:      { type: integer, examples: [11], description: first_shot.score − final.score. }
    tokens:
      type: object
      description: LLM tokens summed across the capture + fix subagents. Best-effort.
      properties: { input: { type: integer }, output: { type: integer } }
```

- [ ] **Step 3: Validate** per `designbook-skill-creator/resources/validate.md` (or `pnpm check` if validation runs in tests). Expected: no SCHEMA-rule violations (every property has description; enums/examples present).

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/schemas.yml
git commit -m "feat(designbook): VerifyResult + ScoreReport schemas"
```

---

## Task 2: `verify-capture` workflow + its outtake

`verify-capture` is `design-verify` minus triage/polish: pure measurement. Reuses the existing `extract-reference`, `intake`, `setup-compare`, `capture`, `compare` tasks. Its outtake emits a `VerifyResult`.

**Files:**
- Create: `.agents/skills/designbook/design/workflows/verify-capture.md`
- Create: `.agents/skills/designbook/design/tasks/outtake--verify-capture.md`

- [ ] **Step 1: Load `designbook-skill-creator` + `rules/workflow-files.md` + `rules/task-files.md` + `rules/common-rules.md`.**

- [ ] **Step 2: Create `verify-capture.md`**

```markdown
---
title: Verify Capture
description: Measure a screen against its design reference — capture, compare, score. No fixing.
params:
  story_id:
    type: string
    resolve: story_id
    sources: [scenes]
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
  setup-compare:
    steps: [setup-compare]
  capture:
    steps: [capture]
  compare:
    steps: [compare]
  outtake:
    steps: [outtake]
engine: direct
---
```

- [ ] **Step 3: Create `outtake--verify-capture.md`** — computes the `VerifyResult` from the compare `issues` (fixed 3/2/1 formula) + the `CompareArtifact`s (diff_percent/passed), submits via `workflow done --data`:

```markdown
---
name: designbook:design:outtake--verify-capture
title: "Outtake: Verify Capture"
trigger:
  steps: [verify-capture:outtake]
priority: 50
params:
  type: object
  required: [story_id, issues]
  properties:
    story_id: { $ref: ../../scenes/schemas.yml#/StoryId }
    issues:   { type: array }
    compare_artifacts: { type: array, default: [] }
result:
  type: object
  required: [verify-result]
  properties:
    verify-result: { $ref: ../schemas.yml#/VerifyResult }
---

# Outtake — Verify Capture

Compute the fidelity measurement for this run and submit it as `verify-result`.

## Steps

1. Group `issues` by `check` (breakpoint--region). For each check count
   `critical` / `major` / `minor` and compute its `score = critical×3 + major×2 + minor×1`.
2. Read `passed` and `diff_percent` per check from `compare_artifacts`.
3. Build the `VerifyResult`:
   - `score` = sum of all per-check scores (0 = perfect).
   - `avg_diff_percent` / `max_diff_percent` = mean / max of the checks' `diff_percent`.
   - `passed` / `total` = passing check count / total checks.
   - `issues` = total `critical` / `major` / `minor` across checks.
   - `checks[]` = one entry per breakpoint × region with its counts, `score`, `passed`, `diff_percent`.
   - `tokens` = your own LLM token usage for this run if available, else omit.
4. Submit: `workflow done --task <id> --data '{"verify-result": <the object>}'`.

The score weighting (critical 3 / major 2 / minor 1, lower = better) is fixed —
do not invent other weights.
```

- [ ] **Step 4: Validate** the two files (skill validator). Expected: no violations.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/workflows/verify-capture.md .agents/skills/designbook/design/tasks/outtake--verify-capture.md
git commit -m "feat(designbook): verify-capture workflow + VerifyResult outtake"
```

---

## Task 3: `verify-fix` workflow

Pure fixing: consume `issues`, run the existing `triage` + `polish` tasks. No measurement.

**Files:**
- Create: `.agents/skills/designbook/design/workflows/verify-fix.md`

- [ ] **Step 1: Load skill-creator + `rules/workflow-files.md` + `common-rules.md`.**

- [ ] **Step 2: Create `verify-fix.md`**

```markdown
---
title: Verify Fix
description: Apply fixes for known visual issues — triage and polish. No capture or scoring.
params:
  story_id:
    type: string
    resolve: story_id
    sources: [scenes]
  issues:
    type: array
    default: []
stages:
  intake:
    steps: [intake]
  triage:
    steps: [triage]
  polish:
    steps: [polish]
  outtake:
    steps: [outtake]
engine: direct
---
```

> The `triage` and `polish` tasks already exist (`design/tasks/triage.md`, `polish.md`) and trigger on the plain `triage`/`polish` steps. `outtake` here reuses the generic design outtake. No new task needed.

- [ ] **Step 3: Validate.** Expected: no violations.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/workflows/verify-fix.md
git commit -m "feat(designbook): verify-fix workflow (triage + polish)"
```

---

## Task 4: `design-verify` orchestrator (subagent-offloaded)

Refactor `design-verify` to a thin orchestrator: an `orchestrate` task dispatches one subagent per sub-workflow run (capture → fix → capture), holding the first `VerifyResult` across the second run; the outtake aggregates into a `ScoreReport`.

**Files:**
- Modify: `.agents/skills/designbook/design/workflows/design-verify.md`
- Create: `.agents/skills/designbook/design/tasks/orchestrate--design-verify.md`
- Modify: `.agents/skills/designbook/design/tasks/outtake--design-verify.md`

- [ ] **Step 1: Load skill-creator + `rules/workflow-files.md` + `rules/task-files.md` + `common-rules.md`.**

- [ ] **Step 2: Replace `design-verify.md` stages** with the orchestrator shape:

```markdown
---
title: Design Verify
description: Visual testing — measure, fix once, re-measure. Orchestrates verify-capture + verify-fix in subagents.
params:
  story_id:
    type: string
    resolve: story_id
    sources: [scenes]
stages:
  orchestrate:
    steps: [orchestrate]
  outtake:
    steps: [outtake]
engine: direct
---
```

- [ ] **Step 3: Create `orchestrate--design-verify.md`** — drives the three subagent runs:

```markdown
---
name: designbook:design:orchestrate--design-verify
title: "Orchestrate: Design Verify"
trigger:
  steps: [design-verify:orchestrate]
priority: 50
params:
  type: object
  required: [story_id]
  properties:
    story_id: { $ref: ../../scenes/schemas.yml#/StoryId }
result:
  type: object
  required: [first_shot, final]
  properties:
    first_shot: { $ref: ../schemas.yml#/VerifyResult }
    final:      { $ref: ../schemas.yml#/VerifyResult }
---

# Orchestrate — Design Verify

Run measure → fix → measure, each as an isolated subagent, so this workflow's
own context stays small. Each subagent runs a child designbook workflow to
completion and returns ONLY its outtake result.

## Steps

1. **First measurement.** Dispatch a subagent (Task tool) instructed to:
   run `/debo verify-capture` for `story_id` ${story_id} to completion and
   return its `verify-result` (a VerifyResult) plus its token usage.
   Keep this as `first_shot`.
2. **If `first_shot.score === 0`**, skip fixing; set `final = first_shot`; go to step 5.
3. **Fix.** Dispatch a subagent instructed to: run `/debo verify-fix` for
   `story_id` ${story_id} with `issues` = the issues behind `first_shot`,
   to completion.
4. **Second measurement.** Dispatch a subagent instructed to: run
   `/debo verify-capture` again for `story_id` ${story_id} (reference
   screenshots are cached; re-capture the fixed Storybook story) and return its
   `verify-result`. Keep as `final`.
5. Submit: `workflow done --task <id> --data '{"first_shot": <VR1>, "final": <VR2>}'`.

Dispatch ONE subagent per run (not per component). Do not run the child
workflows inline — the point is to keep this context small.
```

- [ ] **Step 4: Rewrite `outtake--design-verify.md`** to aggregate into a `ScoreReport`:

```markdown
---
name: designbook:design:outtake--design-verify
title: "Outtake: Design Verify"
trigger:
  steps: [design-verify:outtake]
priority: 50
params:
  type: object
  required: [story_id, first_shot, final]
  properties:
    story_id:   { $ref: ../../scenes/schemas.yml#/StoryId }
    first_shot: { $ref: ../schemas.yml#/VerifyResult }
    final:      { $ref: ../schemas.yml#/VerifyResult }
result:
  type: object
  required: [score-report]
  properties:
    score-report: { $ref: ../schemas.yml#/ScoreReport }
---

# Outtake — Design Verify

Assemble the `ScoreReport` and surface it as the workflow result.

## Steps

1. `delta = first_shot.score − final.score` (positive = polish improved fidelity).
2. `tokens` = sum of `first_shot.tokens` and `final.tokens` per channel when present, else omit.
3. Submit: `workflow done --task <id> --data '{"score-report": {"first_shot": <first_shot>, "final": <final>, "delta": <delta>, "tokens": <summed|omitted>}}'`.
4. Display:

```
## Design Verify — ${story_id}

first_shot: {first_shot.score}   final: {final.score}   delta: {delta}
passed:     {final.passed}/{final.total}   avg diff: {final.avg_diff_percent}
```
```

- [ ] **Step 5: Validate** all three files. Expected: no violations (note WORKFLOW-01: step names plain — `orchestrate`/`outtake` are plain ✓).

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook/design/workflows/design-verify.md .agents/skills/designbook/design/tasks/orchestrate--design-verify.md .agents/skills/designbook/design/tasks/outtake--design-verify.md
git commit -m "feat(designbook): design-verify orchestrator — subagent capture/fix/capture → ScoreReport"
```

---

## Task 5: Consume `overrides` as responsive utilities (rules)

The core + tailwind region-properties rules must tell the AI to emit the mobile-first base + per-breakpoint `overrides` as responsive utilities — otherwise Plan 1's capture data is unused.

**Files:**
- Modify: `.agents/skills/designbook/design/rules/region-properties.md`
- Modify: `.agents/skills/designbook-css-tailwind/rules/region-properties.md`

- [ ] **Step 1: Load skill-creator + `rules/rule-files.md` + `common-rules.md`.**

- [ ] **Step 2: Append to the core `design/rules/region-properties.md` body:**

```markdown
## Responsive (mobile-first)

`region_properties` is mobile-first: `nodes[].style` is the smallest-breakpoint
(base) value; `nodes[].overrides[<bp>]` lists what changes at larger breakpoints.

- Emit `style` as the base, and each `overrides[<bp>]` as the matching responsive
  variant for that breakpoint.
- `overrides[<bp>].hidden === true` → the element is not shown at that breakpoint;
  `hidden === false` → it is revealed at that breakpoint (hidden at base).
- `base_breakpoint` names the base; treat absent `overrides` as "same across breakpoints".
```

- [ ] **Step 3: Append to `designbook-css-tailwind/rules/region-properties.md` body:**

```markdown
## Responsive utilities (mobile-first)

Map the mobile-first `region_properties` to Tailwind's mobile-first utilities:

- `style` → unprefixed base utilities.
- `overrides[<bp>].style` → `<bp>:`-prefixed utilities for only the changed
  properties (e.g. base `flex-col` + `overrides.xl.layout=flex-row` → `flex-col xl:flex-row`).
- `overrides[<bp>].hidden === true` → `<bp>:hidden`; `hidden === false` on a
  node hidden at base → `hidden <bp>:flex` (or the appropriate display).
```

- [ ] **Step 4: Validate** both rule files. Expected: no RULE-01 violations (this is HOW-to-consume guidance, not schema-constraint prose).

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/rules/region-properties.md .agents/skills/designbook-css-tailwind/rules/region-properties.md
git commit -m "feat(designbook): region-properties rules consume mobile-first overrides as responsive utilities"
```

---

## Task 6: `workflow result` prints the scores

Extend `workflow-summary.ts` to read `score_report` / `first_shot` / `final` from `workflow_output` and print them.

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/workflow-summary.ts`
- Test: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-summary.test.ts`

- [ ] **Step 1: Write the failing test** — append to `workflow-summary.test.ts` a case where `tasks.yml` `scope.workflow_output` carries a `score-report`, asserting the printed summary includes the first/final/delta line. Mirror the existing summary-test setup (write a temp `tasks.yml` with `scope.workflow_output.score-report = { first_shot: {score: 17}, final: {score: 6}, delta: 11 }`), then call `readSummary` + `formatHuman` and assert the output contains `first_shot: 17` and `final: 6` and `delta: 11`.

```ts
it('prints first_shot/final/delta when a score-report is present', () => {
  // write tasks.yml with scope.workflow_output['score-report']
  // (follow the existing test's temp-dir + writeFileSync(tasksPath, ...) pattern)
  const r = readSummary({ dataDir, workflowName: 'design-verify' })!;
  const out = formatHuman(r);
  expect(out).toContain('first_shot: 17');
  expect(out).toContain('final: 6');
  expect(out).toContain('delta: 11');
});
```

- [ ] **Step 2: Run it, expect fail.**

Run: `cd packages/storybook-addon-designbook && pnpm vitest run src/cli/__tests__/workflow-summary.test.ts`
Expected: FAIL — score line absent.

- [ ] **Step 3: Implement** — in `workflow-summary.ts`:

In `WorkflowOutput` add:
```ts
  'score-report'?: { first_shot?: { score?: number }; final?: { score?: number }; delta?: number };
```
In `SummaryResult` add:
```ts
  scoreReport?: { firstShot: number; final: number; delta: number };
```
In `readSummary`, after the metrics block, map it:
```ts
  const sr = wo['score-report'];
  const scoreReport =
    sr && typeof sr.first_shot?.score === 'number' && typeof sr.final?.score === 'number'
      ? { firstShot: sr.first_shot.score, final: sr.final.score, delta: sr.delta ?? sr.first_shot.score - sr.final.score }
      : undefined;
```
Add `...(scoreReport ? { scoreReport } : {})` to the returned object.
In `formatHuman`, add a line when present:
```ts
    ...(r.scoreReport
      ? [`  fidelity:     first_shot: ${r.scoreReport.firstShot}  final: ${r.scoreReport.final}  delta: ${r.scoreReport.delta}  (lower is better)`]
      : []),
```

- [ ] **Step 4: Run it, expect pass.**

Run: `cd packages/storybook-addon-designbook && pnpm vitest run src/cli/__tests__/workflow-summary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/workflow-summary.ts packages/storybook-addon-designbook/src/cli/__tests__/workflow-summary.test.ts
git commit -m "feat(addon): workflow result prints first_shot/final/delta fidelity scores"
```

---

## Task 7: Full verification + live smoke

- [ ] **Step 1:** `cd /home/cw/projects/designbook/.claude/worktrees/region-properties-resolver && pnpm check` → typecheck/lint/test PASS (`lint:fix` if formatting flagged).

- [ ] **Step 2: Skill validation** — run the `designbook-skill-creator` validator over the new/changed workflow, task, schema, and rule files. Expected: no violations.

- [ ] **Step 3: Live smoke (optional, requires Storybook + network).** In a fresh `drupal-web` workspace with Storybook running, run `/debo design-verify` for an existing shell story and confirm the orchestrator dispatches three subagent runs and `node dist/cli.js workflow ... result` prints a `fidelity:` line with first_shot/final/delta.

- [ ] **Step 4: Final commit if lint:fix changed anything**

```bash
git add -A && git commit -m "chore: lint:fix after design-verify split" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage (Features 3 & 4):**
- `verify-capture` / `verify-fix` split: Tasks 2, 3 ✓
- `design-verify` orchestrator, subagent-per-run (capture→fix→capture), holds first across second: Task 4 ✓
- `VerifyResult` / `ScoreReport` schemas: Task 1 ✓
- two outtake tasks (verify-capture emits VerifyResult; design-verify emits ScoreReport): Tasks 2, 4 ✓
- scores in result via last-task `--data` → `workflow_output` → `result` command: Tasks 2, 4, 6 ✓
- consume `overrides` as responsive utilities: Task 5 ✓
- `delta = first_shot.score − final.score`, lower-is-better, tokens best-effort: Tasks 4, 6 ✓

**Placeholder scan:** Task 6 Step 1 references "the existing test's temp-dir pattern" rather than re-pasting it — acceptable (the executor reads the sibling test); all production code is complete. No TODO/TBD.

**Type consistency:** result keys `verify-result` (verify-capture) → consumed as `first_shot`/`final` by the orchestrator → nested under `score-report` (ScoreReport). `score-report` key spelling matches across orchestrator outtake `--data`, schema property, and `workflow-summary.ts` (`wo['score-report']`). `VerifyResult.score` / `.tokens` shapes match between Task 1 schema, Task 2 outtake, and Task 6 reader.

**Dependency:** assumes Plan 1 merged (`PropertyNode.overrides`, `base_breakpoint` exist for Task 5's guidance to be meaningful; `computeFidelityScore` is the reference for Task 2's formula).
