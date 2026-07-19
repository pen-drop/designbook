# DESIGNBOOK-17 — Remove parent/child workflow concept — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the parent/child workflow concept from designbook entirely — no `parent` field, no `--parent` flag, no `after:`/`before:` hook chaining, no child auto-creation, no `awaiting-after` status. Workflows are flat single units. No compat, no migration — existing on-disk tasks.yml are disposable.

**Architecture:** Pure excision. The engine (`packages/storybook-addon-designbook/src/workflow.ts`, `cli/workflow.ts`, `cli/workflow-discovery.ts`, `cli/workflow-summary.ts`, `workflow-types.ts`) loses the whole mechanism; the skill docs (`.agents/skills/designbook*` + `designbook-skill-creator`) are rewritten to the flat model. `before:` hooks were never engine-implemented (docs-only) and go with the concept.

**Tech Stack:** TypeScript addon (`pnpm check` = typecheck → lint → test), designbook skill markdown (load `designbook-skill-creator` before editing; load `designbook-addon-skills` before editing addon TS).

## Global Constraints

- Per repo CLAUDE.md: editing skill files under `.agents/skills/designbook*` MUST load `designbook-skill-creator` first; addon TS changes load `designbook-addon-skills`.
- No migration/backwards-compat code (repo rule) — update writer/reader to the new shape only.
- Do NOT touch unrelated `parent`/`children` usages: scene-tree `parent_id`/`child_ids` (`design/schemas.yml`, `renderer/types.ts`, `inspect/*`, `validators/scene.ts`), DOM walking, skill `parent` dirs, Drupal form/menu `children` (`designbook-drupal`), `import/tasks/run-workflow.md` prose (see Open Points).
- Historical docs under `docs/superpowers/plans|specs/` stay untouched.
- `debo-test` setup runs `git reset --hard`/`git clean -fd` — run the tester from a plain checkout, never from a git worktree.

---

### Task 1: Engine core — `packages/storybook-addon-designbook/src/workflow.ts`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow.ts`

- [ ] `WorkflowFile` interface (~L131): remove `parent?: string`, `children?: Array<{name; workflow}>`, and `'awaiting-after'` from the `status` union.
- [ ] Delete `appendChildResultSummary` (~L229), `cascadeParent` (~L284), `holdForAfter` (~L318), `registerChild` (exported, ~L336).
- [ ] Delete `archiveAndCascade` (~L300); call sites archive directly via `archiveWorkflow`.
- [ ] Remove the two `if (data.parent) { cascadeParent … }` blocks (~L304–310 and the one in `workflowAbandon` ~L367).
- [ ] `createWorkflowFile` (~L535): drop the `parent` parameter and `...(parent ? { parent } : {})`.
- [ ] `workflowDone` options (~L1040): drop `after?: AfterDeclaration[]`; drop `awaitingAfter` from the return type; delete the three `holdForAfter(…)` call sites (~L1562, ~L1639, ~L1645) so a final done archives directly.
- [ ] Remove the `AfterDeclaration` import.
- [ ] Verify: `pnpm --filter storybook-addon-designbook exec tsc --noEmit`

### Task 2: CLI — `packages/storybook-addon-designbook/src/cli/workflow.ts`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts`

- [ ] Remove `registerChild` import (~L17).
- [ ] Delete `filterActiveAfterDeclarations` (~L382) and `createAfterWorkflows` (~L406) incl. their jsonata usage (jsonata stays — other resolvers use it).
- [ ] `workflow create`: drop `.option('--parent <name>', …)` (~L506), `parent` from the action opts type (~L508), and from the `runWorkflowCreate` call (~L525); drop `parent` from `runWorkflowCreate`'s options type (~L114) and its pass-through (~L357).
- [ ] `workflow done` final path (~L676–725): delete the whole after-declaration block — definition lookup, `filterActiveAfterDeclarations`, `createAfterWorkflows`, the "awaiting after-workflows" message, and passing `after` into `workflowDone`.
- [ ] Verify: `pnpm --filter storybook-addon-designbook exec tsc --noEmit`

### Task 3: Discovery, summary, types

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/workflow-discovery.ts`
- Modify: `packages/storybook-addon-designbook/src/cli/workflow-summary.ts`
- Modify: `packages/storybook-addon-designbook/src/workflow-types.ts`

- [ ] `workflow-discovery.ts`: remove the `after` frontmatter parsing (~L63–78) and the `after` field from the returned descriptor (~L24).
- [ ] `workflow-summary.ts`: remove the `after` aggregation block (~L89–113), the `children` read (~L48, ~L90), and the `after` key on the result type (~L27–28).
- [ ] `workflow-types.ts`: delete the `AfterDeclaration` interface (~L3–8).
- [ ] Verify: `pnpm --filter storybook-addon-designbook exec tsc --noEmit`

### Task 4: Tests

**Files:**
- Delete: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-after-create.test.ts`
- Delete: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-awaiting-after.test.ts`
- Modify: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-summary.test.ts`
- Sweep: every other test touching the concept

- [ ] Delete the two dedicated test files above.
- [ ] `workflow-summary.test.ts`: remove the three `after` cases (~L121–152: `after-agg`, `after-none`, `after-missing-child` setups) and any `children` fixture keys.
- [ ] Sweep all `src/**/__tests__` for `awaiting-after`, `children`, `AfterDeclaration`, `--parent`, `after:` — rewrite/remove each hit (check at minimum: `workflow-discovery-after.test.ts` if still present, `workflow-resume.test.ts`, `workflow-lifecycle.test.ts`, `workflow-auto-transition.test.ts`, `workflow-definitions.test.ts`, `workflow-config.test.ts`, `workflow-skip-intake.test.ts`, `workflow-instructions-submit-hint.test.ts`, `workflow-provides-result.test.ts`).
- [ ] Verify: `pnpm --filter storybook-addon-designbook test`

### Task 5: Skill docs — flat model

**Files:**
- Modify: `.agents/skills/designbook/resources/workflow-execution.md`
- Modify: `.agents/skills/designbook/resources/cli-workflow.md`
- Modify: `.agents/skills/designbook/tokens/workflows/tokens.md`
- Modify: `.agents/skills/designbook/design/tasks/intake--design-verify.md`
- Modify: `.agents/skills/designbook-skill-creator/rules/workflow-files.md`

- [ ] Load `designbook-skill-creator` before any edit under `.agents/skills/`.
- [ ] `workflow-execution.md`: remove `parent` from the tasks.yml top-level-fields list (~L196); delete §6 Hooks in full (before hooks, after hooks, tokens→css-generate walk-through, ~L215–251).
- [ ] `cli-workflow.md`: remove the `--parent <name>` row (~L35) and `--parent` from the create syntax line (~L26); drop "from parent dispatch" in the `--params` row (~L36).
- [ ] `tokens/workflows/tokens.md`: delete the `after:` frontmatter block (~L16–18).
- [ ] `intake--design-verify.md`: remove the "called as a child workflow" sentence (~L38) and collapse the reference gate to standalone-only (~L49–50: no `$reference_dir` and empty `params.reference` → ask the user; the reference-free fallback prose goes).
- [ ] `designbook-skill-creator/rules/workflow-files.md`: remove the `after:` frontmatter row (~L29) and the `before:`/`after:` Hooks section (~L53–92).
- [ ] Verify: `rg -n "awaiting-after|--parent|after-workflow|parent workflow|after:" .agents/skills/designbook .agents/skills/designbook-skill-creator` → only unrelated prose matches (temporal "after", Drupal children).

### Task 6: Final sweep + checks

- [ ] Repo-wide scoped grep proves AC-1/AC-2: `rg -n "awaiting-after|AfterDeclaration|after-workflow|registerChild|cascadeParent|holdForAfter|--parent" packages/storybook-addon-designbook/src .agents/skills` → no matches.
- [ ] `pnpm check` from repo root — typecheck → lint → test green (AC-4).
- [ ] Functional verify (coding-state policy, runtime surface): from a **plain checkout**, `debo-test run drupal-petshop tokens` — the tokens case exercises the workflow whose `after:` declaration was removed; the run must complete flat, with no css-generate child spawned.
- [ ] Commit the change together with this plan file.

## Open Points (for the confirm gate)

1. `import/tasks/run-workflow.md` iterates sub-workflows as driver-level sequencing (no `--parent`, no `after:`, no `children` — each sub-workflow is standalone with its own tasks.yml). Plan keeps it; optionally reword "parent import workflow" → "import workflow" to kill the last "parent" wording. Confirm.
2. `before:` hooks are docs-only (never engine-implemented) and use the same `--parent` linkage — plan removes them with the concept. Confirm.
3. With `tokens`'s `after:` gone, `css-generate` is only started explicitly — matches the flat model. Confirm no hidden caller relies on the auto-chain.
