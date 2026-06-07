# Stage Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let workflow stages opt into running in an isolated subagent context (`isolate: true`), so a long workflow's late stages stop re-processing the whole run's accumulated context — measured 4–5× billed-input reduction on design-shell.

**Architecture:** A stage-level `isolate:` flag is parsed at `workflow create` and surfaced on each `step_resolved` entry (engine, Part 1 CLI). The AI driver reads the flag and, for isolated steps, dispatches one subagent with a lean stage-executor brief instead of running the step in its own context (skill protocol, Part 1 designbook skill). No `tasks.yml` format change, no validation/scope change; default-off keeps existing workflows byte-identical in behavior.

**Tech Stack:** TypeScript (the `storybook-addon-designbook` package), Vitest, Markdown skill files, YAML workflow frontmatter. The design spec is `docs/superpowers/specs/2026-06-07-stage-isolation-design.md`.

---

## Working location

All work happens in the worktree on branch `stage-isolation`:
`/home/cw/projects/designbook/.claude/worktrees/stage-isolation`

Phase 1 (CLI/engine) uses the `designbook-addon-skills` skill. Phase 2 (skill files) uses the `designbook-skill-creator` skill — load it before editing any file under `.agents/skills/`. `pnpm check` gates every CLI commit.

## File Structure

| File | Responsibility | Phase |
|---|---|---|
| `packages/storybook-addon-designbook/src/workflow-resolve.ts` | Parse stage `isolate` flag; compute per-step; carry on `ResolvedStep` | 1 |
| `packages/storybook-addon-designbook/src/workflow.ts` | Add `isolate` to `StageLoaded`; surface in persisted stage + `buildInstructions` path | 1 |
| `packages/storybook-addon-designbook/src/cli/workflow.ts` | Add `isolate` to `InstructionsResult`; thread from stage | 1 |
| `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts` | New tests for the flag | 1 |
| `.agents/skills/designbook-skill-creator/rules/workflow-files.md` | Document `isolate:` + `## Checks` row | 2 |
| `.agents/skills/designbook/resources/stage-executor.md` | New lean subagent brief | 2 |
| `.agents/skills/designbook/resources/workflow-execution.md` | Orchestrator vs subagent protocol; isolated-step branch | 2 |
| `.agents/skills/designbook/design/workflows/design-shell.md` | Tag heavy stages `isolate: true` | 2 |
| `.agents/skills/designbook/design/workflows/design-screen.md` | Tag heavy stages `isolate: true` | 2 |
| `scripts/profile-run.py` | Commit the measurement profiler used in the spec | 3 |

---

# Phase 1 — Engine: surface `isolate`

## Task 1: Parse and resolve the stage `isolate` flag

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts` (`StageDefinitionFm` ~line 99, `ResolvedStep` ~line 1562, `resolveAllStages` loop ~line 1616 + literal builds ~line 1752 / ~1762)
- Test: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts`

The current `step_resolved` entry is built in two literals (single task / multi-task per step). The flag must appear on both.

- [ ] **Step 1: Write the failing test**

Append to `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts` (the file already imports `resolveAllStages`? — it does not; add it to the existing import block from `../../workflow-resolve.js`, alongside the existing named imports). Then add:

```ts
describe('resolveAllStages — isolate flag', () => {
  let agentsDir: string;
  let config: DesignbookConfig;

  beforeEach(() => {
    agentsDir = makeTmpDir();
    // minimal task files for two steps
    writeSkillTaskFile(agentsDir, 'demo', 'alpha', 'trigger:\n  steps: [alpha]', 'alpha body');
    writeSkillTaskFile(agentsDir, 'demo', 'beta', 'trigger:\n  steps: [beta]', 'beta body');
    config = { data: makeTmpDir() } as unknown as DesignbookConfig;
  });

  it('sets isolate: true only on steps whose stage declares isolate', async () => {
    const wfDir = resolve(agentsDir, 'skills', 'demo', 'workflows');
    mkdirSync(wfDir, { recursive: true });
    const wfPath = resolve(wfDir, 'demo.md');
    writeFileSync(
      wfPath,
      [
        '---',
        'title: Demo',
        'stages:',
        '  one:',
        '    steps: [alpha]',
        '    isolate: true',
        '  two:',
        '    steps: [beta]',
        '---',
      ].join('\n'),
    );

    const resolved = await resolveAllStages(wfPath, config, {}, agentsDir);
    const alpha = resolved.step_resolved['alpha'] as { isolate?: boolean };
    const beta = resolved.step_resolved['beta'] as { isolate?: boolean };
    expect(alpha.isolate).toBe(true);
    expect(beta.isolate).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/validators/__tests__/workflow-resolve.test.ts -t "isolate flag"`
Expected: FAIL — `alpha.isolate` is `undefined` (flag not yet parsed/surfaced).

- [ ] **Step 3: Add `isolate` to the frontmatter and resolved types**

In `workflow-resolve.ts`, extend `StageDefinitionFm` (~line 99):

```ts
interface StageDefinitionFm {
  steps?: string[];
  workflow?: string;
  each?: string;
  domain?: string[];
  isolate?: boolean;
  params?: Record<string, { type: string; prompt: string }>;
}
```

Extend `ResolvedStep` (~line 1562):

```ts
export interface ResolvedStep {
  task_file: string;
  rules: string[];
  blueprints: string[];
  config_rules: string[];
  config_instructions: string[];
  /** Unified schema block (params, result, definitions). Only present when the task declares params/result. */
  schema?: SchemaBlock;
  /** True when the step's stage declared `isolate: true`. Drives subagent dispatch in the driver. */
  isolate?: boolean;
}
```

- [ ] **Step 4: Compute `isolate` per step in `resolveAllStages`**

Inside the `for (const step of allSteps ?? [])` loop in `resolveAllStages`, after the existing stage-domain block (the loop over `stageDefs` that collects `effectiveDomains`, ending ~line 1651), add:

```ts
    // Stage-level isolate flag: true if the step's stage declares isolate: true
    let isolate = false;
    if (stageDefs) {
      for (const [, stageDef] of Object.entries(stageDefs)) {
        if (stageDef.steps?.includes(step) && stageDef.isolate) {
          isolate = true;
          break;
        }
      }
    }
```

- [ ] **Step 5: Surface `isolate` on both `step_resolved` literals**

In the single-task literal (~line 1752):

```ts
      stepResolved[step] = {
        task_file: taskFilePaths[0]!,
        rules: ruleFiles,
        blueprints: blueprintFiles,
        config_rules,
        config_instructions,
        ...(hasSchema ? { schema: schemaBlock } : {}),
        ...(isolate ? { isolate: true } : {}),
      };
```

In the multi-task literal (~line 1762):

```ts
      stepResolved[step] = taskFilePaths.map((taskFile) => ({
        task_file: taskFile,
        rules: ruleFiles,
        blueprints: blueprintFiles,
        config_rules,
        config_instructions,
        ...(hasSchema ? { schema: schemaBlock } : {}),
        ...(isolate ? { isolate: true } : {}),
      }));
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/validators/__tests__/workflow-resolve.test.ts -t "isolate flag"`
Expected: PASS (2 assertions).

- [ ] **Step 7: Full check + commit**

Run: `cd /home/cw/projects/designbook/.claude/worktrees/stage-isolation && pnpm check`
Expected: typecheck + lint + all tests pass (968 tests — the prior 966 plus the new 1 test with 2 assertions counts as +1 test file entry; the exact count is not the gate, "0 failures" is).

```bash
git add packages/storybook-addon-designbook/src/workflow-resolve.ts packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts
git commit -m "feat(workflow): parse stage isolate flag, surface on step_resolved

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Carry `isolate` through persisted stage + `workflow instructions`

This makes the flag survive a resume (`workflow list` → continue, where the driver no longer holds the original create response and re-fetches via `workflow instructions`).

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow.ts` (`StageLoaded` ~line 57; the `--loaded` dedup write ~line 1352; the serializer that maps `stage_loaded` ~line 464)
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts` (`InstructionsResult` ~line 40; `buildInstructions` return ~line 96; `LoadedPayload` ~line 1049)
- Test: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-instructions-submit-hint.test.ts` (existing instructions test file — add a case)

Note: `StageLoaded` is populated from the `--loaded` payload the driver sends at `workflow done`. The driver gets `isolate` from `step_resolved` (Task 1) and includes it in `--loaded`. So the plumbing is: extend `LoadedPayload` + `StageLoaded` + the dedup write + `buildInstructions`/`InstructionsResult`.

- [ ] **Step 1: Write the failing test**

Open `packages/storybook-addon-designbook/src/cli/__tests__/workflow-instructions-submit-hint.test.ts`, read its existing setup (how it constructs a `tasks.yml` with `stage_loaded` and calls `buildInstructions`). Add a test mirroring that setup but with `isolate: true` on the stage_loaded entry, asserting the returned `InstructionsResult.isolate === true`:

```ts
it('returns isolate: true when the stage_loaded entry is isolated', () => {
  // Reuse the file's existing tasks.yml builder/helper; set isolate on the entry.
  // (Match the helper name used elsewhere in this file — e.g. writeTasksYml(...).)
  const dataDir = writeTasksYml({
    workflow: 'demo-1',
    stage_loaded: {
      alpha: {
        task_file: '/abs/alpha.md',
        rules: [],
        blueprints: [],
        config_rules: [],
        config_instructions: [],
        isolate: true,
      },
    },
    stages: { one: { steps: ['alpha'] } },
  });
  const res = buildInstructions(dataDir, 'demo-1', 'alpha') as InstructionsResult;
  expect(res.isolate).toBe(true);
});
```

If this test file does not already export/import `buildInstructions` and `InstructionsResult`, add them to its imports from `../workflow.js`. If there is no reusable `writeTasksYml` helper, copy the minimal `tasks.yml`-writing pattern already present in the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/cli/__tests__/workflow-instructions-submit-hint.test.ts -t "isolate"`
Expected: FAIL — `res.isolate` is `undefined`.

- [ ] **Step 3: Extend `StageLoaded` and `LoadedPayload`**

In `workflow.ts`, `StageLoaded` (~line 57):

```ts
export interface StageLoaded {
  task_file: string;
  rules: string[];
  blueprints: string[];
  config_rules: string[];
  config_instructions: string[];
  schema?: import('./schema-block.js').SchemaBlock;
  /** True when this step's stage is isolated. Mirrors ResolvedStep.isolate. */
  isolate?: boolean;
}
```

In `workflow.ts`, `LoadedPayload` (~line 1049):

```ts
export interface LoadedPayload {
  task_file?: string;
  rules?: string[];
  blueprints?: string[];
  config_rules?: string[];
  config_instructions?: string[];
  isolate?: boolean;
}
```

- [ ] **Step 4: Persist `isolate` in the `--loaded` dedup write**

In `workflow.ts`, the dedup block (~line 1352) currently writes `data.stage_loaded[stepName] = { task_file, rules, blueprints, config_rules, config_instructions }`. Add the flag:

```ts
        if (!data.stage_loaded[stepName]) {
          data.stage_loaded[stepName] = {
            task_file: loaded.task_file ?? '',
            rules: loaded.rules ?? [],
            blueprints: loaded.blueprints ?? [],
            config_rules: loaded.config_rules ?? [],
            config_instructions: loaded.config_instructions ?? [],
            ...(loaded.isolate ? { isolate: true } : {}),
          };
        }
```

- [ ] **Step 5: Surface in `buildInstructions` / `InstructionsResult`**

In `cli/workflow.ts`, `InstructionsResult` (~line 40) add `isolate?: boolean;`. In `buildInstructions` return (~line 96):

```ts
  return {
    stage: stageName,
    task_file: taskFile,
    rules,
    blueprints,
    config_rules: stage.config_rules ?? [],
    config_instructions: stage.config_instructions ?? [],
    ...(schema ? { schema } : {}),
    ...(submitResults ? { submit_results: submitResults } : {}),
    ...(stage.isolate ? { isolate: true } : {}),
  };
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/cli/__tests__/workflow-instructions-submit-hint.test.ts -t "isolate"`
Expected: PASS.

- [ ] **Step 7: Full check + commit**

Run: `cd /home/cw/projects/designbook/.claude/worktrees/stage-isolation && pnpm check`
Expected: 0 failures.

```bash
git add packages/storybook-addon-designbook/src/workflow.ts packages/storybook-addon-designbook/src/cli/workflow.ts packages/storybook-addon-designbook/src/cli/__tests__/workflow-instructions-submit-hint.test.ts
git commit -m "feat(workflow): carry isolate through loaded payload + instructions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 2 — Skill files

> Load `designbook-skill-creator` before editing ANY file under `.agents/skills/`. For `workflows/*.md` and `rules/*.md`, load `rules/common-rules.md` + the matching file-type rule first (per CLAUDE.md).

## Task 3: Document the `isolate:` field in workflow-files rules

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/rules/workflow-files.md` (the `### \`stages:\`` section ~line 32, and the `## Checks` table ~line 116)

- [ ] **Step 1: Load the authoring rule**

Invoke `designbook-skill-creator`, then read `rules/common-rules.md` + `rules/workflow-files.md` to confirm current shape before editing.

- [ ] **Step 2: Add `isolate:` to the stages documentation**

In `workflow-files.md`, under the `### \`stages:\`` section, after the `domain:` paragraph, add:

```markdown
A stage may declare `isolate: true` to run that stage's task(s) in a dedicated subagent context instead of inline in the orchestrator. Default is `false` (absent). Use it on context-heavy stages of long workflows; tiny stages (intake, setup, outtake) stay inline. The engine surfaces the flag on each `step_resolved` entry and on `workflow instructions`; the driver acts on it per `resources/workflow-execution.md`. An isolated stage with multiple `each:`-expanded tasks runs as ONE subagent that loops over the sibling tasks, not one subagent per task.

\```yaml
stages:
  create-component:
    steps: [create-component]
    isolate: true
\```
```

(Render the fenced block with real backticks — the `\`` escaping above is only to embed it in this plan.)

- [ ] **Step 3: Add a `## Checks` row**

In the `## Checks` table, add:

```markdown
| WORKFLOW-02 | warning | If any `stages.*.isolate` is present, it is a boolean | body |
```

- [ ] **Step 4: Validate + commit**

Run the skill validator if available (`resources/validate.md` procedure), else visually confirm the table + section are well-formed Markdown.

```bash
git add .agents/skills/designbook-skill-creator/rules/workflow-files.md
git commit -m "docs(skill-creator): document stage isolate flag

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Write the lean stage-executor brief

**Files:**
- Create: `.agents/skills/designbook/resources/stage-executor.md`

This is the prompt an orchestrator hands to an isolated-stage subagent. It must let a fresh subagent run a stage without reloading the full `designbook` skill. Keep it short — it is the bootstrap budget (target ≤ a few k tokens of instructions).

- [ ] **Step 1: Create the file**

```markdown
# Stage Executor (subagent brief)

You are a stage executor dispatched by a designbook workflow orchestrator to run ONE stage in isolation. Your context is disposable: do the work, submit results, return a compact summary. Do NOT load the full `designbook` skill.

`_debo` = `npx storybook-addon-designbook`.

## What the orchestrator gives you

- `WORKFLOW_NAME` — the active workflow name (e.g. `design-shell-2026-…`).
- `WORKSPACE_ROOT` — absolute path; run all `_debo` commands from here.
- One or more in-progress task ids for this stage.
- For each step: its `task_file` path, `rules[]` paths, `blueprints[]` paths, and the result/params `schema`.
- The scope subset this stage needs (compact data results from earlier stages).
- Paths (not contents) of any bulky upstream artifacts this stage consumes — read them yourself, here, in your own context.

## What you do

1. Read the `task_file`, then every `rules` path (hard constraints) and `blueprints` path (overridable starting points). Read any upstream artifact paths you were given.
2. Fill every required result key in the `schema`. Obey every rule. Follow the task body's flow.
3. If you need user input, you cannot prompt directly — return control to the orchestrator with a `needs_user` summary (the orchestrator owns `workflow wait`/`resume`). Only do this when the schema genuinely cannot be filled otherwise.
4. Submit results — all keys in one payload:
   \`\`\`bash
   _debo workflow done --workflow $WORKFLOW_NAME --task <task-id> --data '<json-with-all-result-keys>' --loaded '<json>'
   \`\`\`
   The `--loaded` JSON carries the paths you actually loaded (`task_file`, `rules`, `blueprints`, and `isolate: true`) for observability/resume.
   For `submission: direct` results, run the external tool, then `_debo workflow result --workflow $WORKFLOW_NAME --task <task-id> --key <k>` (omit `--json`).
5. On validation failure, repair the submitted content and re-run `workflow done` until the task passes. Never stop at reporting an error.
6. If the stage has multiple tasks (each-expansion), loop steps 1–5 over each in-progress task before returning.

## Forbidden

- Writing a declared result path with the Write tool — results go through `workflow done --data` (or `workflow result`).
- Loading orchestration docs (create/resume/after-hooks) — those belong to the orchestrator.

## What you return

A compact summary ONLY: the completed task id(s), the final `RESPONSE:` JSON from your last `workflow done`, and one line per task on what you produced. Do NOT echo task bodies, rule text, artifact contents, screenshots, or your reasoning — that context dies with you and must not flow back to the orchestrator.
```

(Use real backticks for the fenced bash block.)

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook/resources/stage-executor.md
git commit -m "docs(designbook): add lean stage-executor subagent brief

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Add the orchestrator/subagent branch to workflow-execution.md

**Files:**
- Modify: `.agents/skills/designbook/resources/workflow-execution.md` (Task Loop §3, step 4 ~line 79; and a new subsection)

- [ ] **Step 1: Add an isolated-step branch at the top of the Task Loop**

In `workflow-execution.md`, at the start of `## 3. Task Loop`, before "### 1. Read the schema…", insert:

```markdown
### 0. Inline or isolated?

Check `step_resolved[<current-step>].isolate` (also surfaced on `workflow instructions` as `isolate`).

- **Absent / false** — run this step inline, exactly as steps 1–7 below.
- **`true`** — do NOT read the task body, rules, or blueprints yourself. Dispatch ONE subagent with the brief in [`stage-executor.md`](stage-executor.md), passing: `$WORKFLOW_NAME`, the workspace root, the in-progress task id(s) for this step, the step's `task_file`/`rules`/`blueprints`/`schema` from `step_resolved`, the scope subset the stage needs, and paths (not contents) of any bulky upstream artifacts it consumes. The subagent calls `workflow done` itself. When it returns, read ONLY its compact summary + the `RESPONSE:` JSON, then continue at step 7 (Follow the response). The subagent's intermediate context never enters yours.

If the subagent returns `needs_user`, run `workflow wait` → ask the user → `workflow resume`, then re-dispatch the subagent with the answer added to the scope subset.
```

- [ ] **Step 2: Cross-reference from step 4**

In `### 4. Read rules and blueprints silently`, append a sentence:

```markdown
(For isolated steps you skip this entirely — the subagent reads rules and blueprints in its own context. See step 0.)
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/resources/workflow-execution.md
git commit -m "docs(designbook): orchestrator/subagent protocol for isolated stages

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Tag heavy stages in design-shell and design-screen

**Files:**
- Modify: `.agents/skills/designbook/design/workflows/design-shell.md` (`stages:` block)
- Modify: `.agents/skills/designbook/design/workflows/design-screen.md` (`stages:` block)

Tag the context-heavy stages only. Per the spec: `extract-reference`, `create-component`, `capture`, `compare`, and the scene stage. Leave `intake`, `setup-compare`, `validate`, `outtake`, `sample-data`, `entity-mapping` inline.

- [ ] **Step 1: Tag design-shell stages**

In `design-shell.md`, add `isolate: true` to these stages:

```yaml
stages:
  reference:
    steps: [extract-reference]
    isolate: true
  intake:
    steps: [intake]
  component:
    steps: [create-component]
    isolate: true
  scene:
    steps: [create-scene-file, create-scene]
    isolate: true
  validate:
    steps: [validate]
  setup-compare:
    steps: [setup-compare]
  capture:
    steps: [capture]
    isolate: true
  compare:
    steps: [compare]
    isolate: true
  outtake:
    steps: [outtake]
```

- [ ] **Step 2: Tag design-screen stages**

In `design-screen.md`, add `isolate: true` to `reference`, `component`, `scene`, `capture`, `compare`; leave the rest:

```yaml
stages:
  reference:
    steps: [extract-reference]
    isolate: true
  intake:
    steps: [intake]
    domain: [data-model]
  component:
    steps: [create-component]
    isolate: true
  sample-data:
    steps: [create-sample-data]
  entity-mapping:
    steps: [map-entity]
  scene:
    steps: [create-scene]
    domain: [data-model]
    isolate: true
  setup-compare:
    steps: [setup-compare]
  capture:
    steps: [capture]
    isolate: true
  compare:
    steps: [compare]
    isolate: true
  outtake:
    steps: [outtake]
```

- [ ] **Step 3: Verify the flag resolves**

Run: `cd /home/cw/projects/designbook/.claude/worktrees/stage-isolation && pnpm --filter storybook-addon-designbook test`
Expected: 0 failures (the plan/smoke tests render these workflows; adding `isolate:` must not break rendering or slug checks).

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/workflows/design-shell.md .agents/skills/designbook/design/workflows/design-screen.md
git commit -m "feat(designbook): isolate heavy stages in design-shell/design-screen

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 3 — Validation

## Task 7: Commit the profiler and document the before/after procedure

**Files:**
- Create: `scripts/profile-run.py` (the analyzer used in the spec — per-stage billed input, subagent model, reads)
- Create: `docs/superpowers/plans/2026-06-07-stage-isolation-measurement.md` (the run-it-yourself procedure)

- [ ] **Step 1: Write the profiler**

Create `scripts/profile-run.py` with the stage-segmented analyzer (the logic from the design phase): given a Claude Code transcript `.jsonl`, it reports assistant turns, summed billed input, per-stage breakdown, the subagent-reset cost model at bootstrap ∈ {8k,15k,25k}, and the read-duplication table. (Reuse the implementation developed during the design; it has no external deps — stdlib only.)

- [ ] **Step 2: Write the measurement procedure doc**

Create `docs/superpowers/plans/2026-06-07-stage-isolation-measurement.md`:

```markdown
# Stage Isolation — Before/After Measurement

Acceptance test for the stage-isolation feature. Same scenario, monolith vs isolated.

## Scenario
design-shell against the `drupal-web` workspace fixture (the run profiled in the design spec).

## Procedure
1. **Baseline (monolith):** check out `main`, run design-shell to completion in the drupal-web workspace, note the session transcript path.
   Run: `python3 scripts/profile-run.py <transcript.jsonl>` → record `billed input (sum)`.
2. **Treatment (isolated):** check out `stage-isolation`, run the same design-shell. Collect the orchestrator transcript AND every subagent transcript.
   Run the profiler on each, SUM the billed-input totals (subagent tokens are real, not free).
3. **Compare:** treatment_total vs baseline_total.

## Pass criteria
- treatment_total ≤ baseline_total / 3 (≥3× reduction).
- Produced artifacts identical (component files, scene, screenshots) and all `workflow done` validations pass in both runs.

## If below 3×
Inspect bootstrap bloat in `stage-executor.md` before widening the isolation set. Re-decide whether `outtake` should be isolated using a clean end-user run's turn counts.
```

- [ ] **Step 3: Commit**

```bash
git add scripts/profile-run.py docs/superpowers/plans/2026-06-07-stage-isolation-measurement.md
git commit -m "chore: commit run profiler + stage-isolation measurement procedure

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Self-Review notes (for the implementer)

- **Spec coverage:** `isolate` flag (Task 1), resume path (Task 2), authoring docs + check (Task 3), lean brief (Task 4), driver protocol (Task 5), default-off heavy-stage tagging (Task 6), validation gate + profiler (Task 7). `outtake` left inline per spec.
- **Backward compatibility:** every `isolate` surfacing is guarded by `...(isolate ? { isolate: true } : {})`, so un-tagged workflows produce byte-identical `step_resolved`/`stage_loaded`/instructions output. No `tasks.yml` format change.
- **Type consistency:** the property is `isolate: boolean` everywhere — `StageDefinitionFm`, `ResolvedStep`, `StageLoaded`, `LoadedPayload`, `InstructionsResult`. Driver reads `step_resolved[step].isolate` and `instructions.isolate`.
- **Test-file imports:** Task 1 requires adding `resolveAllStages` to the test file's import block (it is not currently imported there); Task 2 requires `buildInstructions`/`InstructionsResult` in its test file. Both noted in-task.
- **Not auto-verifiable:** the 4–5× reduction is an empirical claim validated by Task 7's manual run, not a unit test.
