# Design Verify — Enforced After-Workflows & Merged Verify Workflow

Date: 2026-06-06
Status: approved design, pending implementation plan

## Problem

`design-verify` was split into `verify-capture` + `verify-fix` (branch
`region-properties-resolver`, never merged to main) so the first-shot score
could be measured before fixes. The split's only structural purpose was that
measurement; `first_shot` is now an explicit value in the result schema
(`ScoreReport`), so the split is obsolete.

Two real problems remain:

1. **Invocation is not guaranteed.** `after: [design-verify]` on design
   workflows is an AI-driven hook — skippable, and `story_id` must be
   hand-passed by the driver.
2. **The result is invisible to scoring.** The verify result lands in the
   *child* workflow's result; `workflow summary --workflow <parent>` never
   sees it. `debo-test research` scores `flowRate` only, so we cannot tell
   which experiment (Maßnahme) improved visual fidelity.

## Decisions

| Topic | Decision |
|---|---|
| Enforcement point | CLI-enforced after-hooks (not harness-side, not prose) |
| Execution model | CLI auto-creates child workflow, returns its id; driver AI dispatches a subagent per child and waits |
| Linking | Bidirectional: `parent_id` on child, `children: [{id, workflow}]` on parent |
| Result surfacing | `workflow summary` aggregates child results under `after.<workflow>`; parent's stored result untouched |
| Workflow split | Reverted — one `design-verify` workflow; `verify-capture`/`verify-fix` not merged to main |
| Research metric | JSONata expression over the summary JSON, configured per case yaml |
| Expression language | JSONata everywhere (already a dependency: `resolvers/registry.ts`, `workflow.ts`, `expression-cache.ts`) |

## Part 1 — CLI (`storybook-addon-designbook`)

1. **Auto-create + return id.** The final `workflow done` on a parent
   workflow reads the workflow definition's `after:` list, creates each child
   workflow with params resolved via JSONata mapping over the parent's
   params/results, and responds:

   ```json
   { "status": "awaiting-after", "next_workflows": [{ "id": "wf-123", "workflow": "design-verify" }] }
   ```

2. **`after:` declaration with param mapping** (same JSONata mechanic as
   resolver `from:`):

   ```yaml
   after:
     - workflow: design-verify
       params:
         story_id: story_id   # JSONata over parent params
   ```

3. **Driver contract.** The driver AI dispatches one subagent per returned
   workflow id ("execute workflow <id> to completion") and waits. Fresh
   context per after-workflow.

4. **Completion cascade.** A child's final `workflow done` validates the
   result against the task's result schema (existing behavior). When all
   children are `complete`, the CLI flips the parent from `awaiting-after`
   to `complete` automatically. No separate parent call.

5. **Enforcement semantics.** If the driver skips the subagent, the parent
   stays `awaiting-after` — it never reads as complete. Visible in
   `workflow summary`; debo-test scores such a run as crash.

6. **Bidirectional linking.** Auto-create writes `parent_id` into the child
   meta and appends `{id, workflow}` to the parent's `children`. Summary
   reads `children` directly (no scan); `parent_id` serves bottom-up
   navigation/debugging.

7. **Summary aggregation.** `workflow summary --workflow <parent>` walks
   `children` and embeds each child's result under
   `after.<workflow-name>` (e.g. `after.design-verify.score-report`).

8. **Result summary in the addon task panel.** `WorkflowPanel` shows a
   single compact summary line for a completed workflow's result, including
   aggregated `after.*` child results (e.g.
   `design-verify: first_shot 34 → final 12 (Δ 22)` — lower score is better,
   `delta = first_shot − final`, positive = improvement). Summary only — no expanded
   result tree; details stay in `workflow summary --json`. Data source is
   the same aggregation as item 7.

## Part 2 — Skills: merge verify workflows

The split exists only on branch `region-properties-resolver`. Main still has
the old single `design-verify`. Work happens on a new branch off main,
cherry-picking the good parts of the split branch:

1. **`design-verify.md`** — single workflow:

   ```yaml
   stages:
     reference:     { steps: [extract-reference] }
     intake:        { steps: [intake] }
     setup-compare: { steps: [setup-compare] }
     capture:       { steps: [capture] }
     compare:       { steps: [compare] }   # → first_shot
     triage:        { steps: [triage] }    # skipped when first_shot.score == 0
     polish:        { steps: [polish] }
     re-capture:    { steps: [capture] }
     re-compare:    { steps: [compare] }   # → final
     outtake:       { steps: [outtake] }   # ScoreReport {first_shot, final, delta}
   before:
     - workflow: css-generate
       execute: always                     # stale-CSS rationale from split branch
   ```

2. **Adopt from split branch:** `ScoreReport` schema (`first_shot`, `final`,
   `delta`) in `design/schemas.yml`; `outtake--design-verify.md` adapted to
   take `first_shot`/`final` from stage results instead of subagent returns.

3. **Delete (i.e. do not merge):** `verify-capture.md`, `verify-fix.md`,
   `orchestrate--design-verify.md`.

4. **Design workflows** (`design-shell.md`, `design-screen.md`,
   `design-component.md`): `after:` block with declarative `story_id`
   param mapping replaces the prose instruction ("the driver MUST supply
   story_id").

5. **Open issue — duplicate step names.** Stages `re-capture`/`re-compare`
   trigger the same tasks as `capture`/`compare`; the step name `capture`
   appears twice in one workflow. Engine/task discovery must support a step
   name recurring in different stages. Fallback: a second trigger entry in
   the task frontmatter (e.g. `re-capture`).

## Part 3 — debo-test integration

1. **Metric as JSONata expression in case yaml:**

   ```yaml
   # fixtures/<suite>/cases/<case>.yaml
   metric: after.`design-verify`.`score-report`.first_shot.score
   ```

   Evaluated against the `workflow summary --json` output. Default when
   absent: `flowRate` (current behavior). `--metric` CLI flag overrides.
   Composite metrics come free (`first_shot.score + delta * 0.5`).

   For design-shell and design-section research the metric is
   `first_shot.score` — it measures what the generation workflow produced
   before any fix pass. A companion `direction: min|max` field declares
   which way is better (VerifyResult scores: lower is better → `min`;
   flowRate-style metrics: `max`, the default).

2. **`research.md` changes:**
   - Score step evaluates the metric expression instead of hardcoded
     `.flowRate`.
   - `score-history.tsv`: decision column becomes `score` (metric value);
     `flow_rate`, `first_shot`, `final`, `delta` are logged as fixed
     additional columns regardless of which is the decision metric.
   - Crash definition extended: parent ends in `awaiting-after` OR the
     metric expression evaluates to `undefined` → `crash` (existing retry
     semantics: 3×, then `blocked`).

3. **`run.md`:** after workflow completion, display `workflow summary`
   including `after.*` results so manual runs show what verify measured.

4. **Outcome:** every research iteration has a guaranteed (Part 1
   enforcement), schema-valid `first_shot`/`final`. "Which Maßnahme helped"
   = the `first_shot.score` history across iterations.

## Packaging

- No OpenSpec. OpenSpec is legacy; full cleanup (its `openspec/` dir, the
  `openspec-*` skills, `opsx-*` commands, plus references in
  `designbook/SKILL.md:18`, `designbook-test/workflows/run.md:50`,
  `scripts/setup-workspace.sh:48`,
  `packages/integrations/test-integration-drupal/CLAUDE.md`) is a separate,
  deferred task.
- One branch off main, one implementation plan, two phases:
  - **Phase 1 — CLI** (Part 1): TypeScript, implemented with
    `designbook-addon-skills` loaded. `pnpm check` gates.
  - **Phase 2 — Skills** (Parts 2+3): skill files, implemented with
    `designbook-skill-creator` loaded.
  - Phase 2 depends hard on Phase 1 (after-hook engine, summary
    aggregation, metric evaluation).

## Out of scope

- OpenSpec removal (deferred, own task)
- Subagent-per-stage as a generic engine feature — discussed and desirable,
  but this design only needs subagent-per-after-workflow. Per-stage
  isolation is a follow-up.
- Branch `region-properties-resolver` disposal (rebase/close) — decided at
  implementation time.
