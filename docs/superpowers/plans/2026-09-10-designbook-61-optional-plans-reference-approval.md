# DESIGNBOOK-61 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make plan persistence and execution starts optional, add revision-side reference approval, and keep one sealed-plan contract for ephemeral, persist, standalone, and GAIA runs.

**Architecture:** Extend the DESIGNBOOK-59 MD-plan engine with `plan build --ephemeral`, skill-level execution modes (`ephemeral` | `persist` | `ask`), a `ReferenceNeed` + `approval.yml` gate beside published revisions, precise blockades instead of a complexity scorer, and `designbook-gaia` updates so coding can execute a pre-persisted plan without auto-starting intake execution.

**Tech Stack:** TypeScript (Commander, Vitest) in `packages/storybook-addon-designbook`; Designbook skill markdown under `.agents/skills/designbook/` and `designbook-gaia/`; debo-test fixtures under `fixtures/`.

**Spec:** `docs/superpowers/specs/2026-09-10-designbook-61-optional-plans-reference-approval-design.md`

## Global Constraints

- Run `pnpm check` (typecheck → lint → test, fail-fast) before every TypeScript commit.
- Auto-fix: `pnpm --filter storybook-addon-designbook lint:fix`.
- **No migration / backwards-compat / legacy-artifact code.** Disposable on-disk artifacts; new writers/readers only (AC-10).
- Before creating or editing any task/rule/blueprint/workflow/`schemas.yml` under `.agents/skills/designbook/` or `designbook-*/` (except `designbook-gaia` prose), load **`designbook-skill-creator`** and the matching per-file-type rule.
- For addon TS, load **`designbook-addon-skills`**.
- `_debo` = `npx storybook-addon-designbook`.
- Verify skill/runtime changes with **`debo-test`**, not ad-hoc only.
- Do not start coding work in the spec state; this plan is for the coding state.

---

### Task 1: CLI — `plan build --ephemeral`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/plan.ts`
- Modify: `packages/storybook-addon-designbook/src/plan-build.ts` (only if build result needs an `ephemeral` marker)
- Test: `packages/storybook-addon-designbook/src/cli/__tests__/plan.test.ts` and/or `src/__tests__/plan-build.test.ts`

**Interfaces:**
- Consumes: existing `buildPlan` / `writePlan`
- Produces: `plan build … --ephemeral` writes under `$DESIGNBOOK_DATA/plans/.ephemeral/<unique>.plan.md` (or documented equivalent), stdout JSON `{ ok, plan, ephemeral: true, steps, tasks }`

- [ ] **Step 1: Write the failing test**

Assert `plan build <workflow> --tasks <file> --ephemeral` (with test configDir) creates a plan path containing `.ephemeral`, sets `ephemeral: true` in JSON, and does not write the canonical non-ephemeral `plan_path` from intake.

- [ ] **Step 2: Run the test — expect FAIL**

Run: `pnpm --filter storybook-addon-designbook test -- plan`  
Expected: FAIL (unknown option or missing ephemeral behavior).

- [ ] **Step 3: Implement `--ephemeral`**

In `cli/plan.ts` `build` action: when `--ephemeral`, choose a unique path under `plans/.ephemeral/`, pass as output, include `ephemeral: true` in the printed JSON. Reuse `--output` internally if cleaner; do not break existing `--output` callers.

- [ ] **Step 4: Run the test — expect PASS**

Run: `pnpm --filter storybook-addon-designbook test -- plan`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/plan.ts \
  packages/storybook-addon-designbook/src/plan-build.ts \
  packages/storybook-addon-designbook/src/cli/__tests__/plan.test.ts \
  packages/storybook-addon-designbook/src/__tests__/plan-build.test.ts
git commit -m "feat(plan): add plan build --ephemeral for non-durable sealed plans"
```

---

### Task 2: Approval record — schema + check helpers

**Files:**
- Create or extend schemas under `packages/storybook-addon-designbook` and/or `.agents/skills/designbook/design/schemas.yml` for `ReferenceApproval` / `ReferenceNeed` as decided in coding (keep JSON Schema as SSOT; skill-creator if editing `schemas.yml`)
- Create: `packages/storybook-addon-designbook/src/reference-approval.ts` (read/write/validate)
- Modify: `packages/storybook-addon-designbook/src/cli/inspect-register.ts` (or small `reference` subcommands) to expose check/write
- Test: `packages/storybook-addon-designbook/src/__tests__/reference-approval.test.ts`

**Interfaces:**
- Produces:
  - `writeApproval(revisionDir, { status, scope, … })` → `approval.yml`
  - `checkApproval(revisionDir, needScope) → { ok, reason }` — fails on missing file, non-approved status, fingerprint ≠ publication binding, or scope not covering need

- [ ] **Step 1: Write failing unit tests**

Cases: approved+matching fingerprint+covering scope → ok; pending → not ok; rejected → not ok; fingerprint drift → not ok; partial scope → not ok.

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm --filter storybook-addon-designbook test -- reference-approval`  
Expected: FAIL (module missing).

- [ ] **Step 3: Implement helpers + minimal CLI**

Implement file IO next to `publication.json`. Document commands in skill CLI reference (Task 5 can finish prose).

- [ ] **Step 4: Tests PASS + commit**

```bash
git add packages/storybook-addon-designbook/src/reference-approval.ts \
  packages/storybook-addon-designbook/src/__tests__/reference-approval.test.ts \
  packages/storybook-addon-designbook/src/cli/inspect-register.ts
git commit -m "feat(reference): approval.yml gate beside published revisions"
```

---

### Task 3: Skill builder — execution modes (docs contract)

**Files:**
- Modify: `.agents/skills/designbook/resources/workflow-building.md`
- Modify: `.agents/skills/designbook/resources/workflow-execution.md` (blockade + no scope invent; ephemeral cleanup note)
- Modify: `.agents/skills/designbook/resources/cli-workflow.md` / `cli-reference.md` as applicable
- Modify: `.agents/skills/designbook/SKILL.md` (remove unconditional “write MD plan and invoke execute-workflow” as the only path)

**Guardrail:** load `designbook-skill-creator` only if editing guarded task/rule/blueprint/workflow/schemas; these resource files are shared prose — still keep WHAT/HOW discipline.

- [ ] **Step 1: Rewrite builder step 4 into modes**

Document `ephemeral` | `persist` | `ask`, defaults from the spec (vision→ephemeral, design create/rebuild→ask, explicit persist, caller override wins). Persist: stop after `plan build`, hand `plan_path` out. Ephemeral: `plan build --ephemeral` then `execute-workflow`, then delete ephemeral plan. Ask: present three choices before build/execute.

- [ ] **Step 2: Document blockade contract**

Exact why; user/GAIA intervenes; executor must not add tasks or widen scope.

- [ ] **Step 3: Document ReferenceNeed + approval check before design `plan build`**

Point to approval helpers and extract-reference closeout.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/resources/workflow-building.md \
  .agents/skills/designbook/resources/workflow-execution.md \
  .agents/skills/designbook/resources/cli-workflow.md \
  .agents/skills/designbook/resources/cli-reference.md \
  .agents/skills/designbook/SKILL.md
git commit -m "docs(skills): optional plan persistence and execution modes"
```

---

### Task 4: Per-workflow intake defaults + reference intake gate

**Files:**
- Modify: `.agents/skills/designbook/skills/vision/resources/intake.md` → default ephemeral
- Modify: `.agents/skills/designbook/skills/design-screen/resources/intake.md` (and design-entity/shell/component as needed) → ask on create/rebuild; change may ephemeral; blockade on growth; approval check
- Modify: `.agents/skills/designbook/design/resources/reference-intake.md` / `write-planning.md` — ReferenceNeed emission; require approved revision before sealing design plan
- Modify: `.agents/skills/designbook/skills/extract-reference/resources/intake.md` — after publish, present screenshots, write `approval.yml` pending→approved/rejected with user; do not chain design execute
- Other foundation intakes that currently say “invoke execute-workflow automatically”: align with builder modes (at least stop claiming universal auto-execute)

**Guardrail:** load `designbook-skill-creator` + `rules/task-files.md` / relevant rules before editing guarded files under `design/tasks` if any task body must mention approval; prefer resource/intake prose when possible.

- [ ] **Step 1: Load designbook-skill-creator; patch vision + design-screen intakes**

- [ ] **Step 2: Patch reference-intake + extract-reference closeout for approval**

- [ ] **Step 3: Sweep remaining “automatically” execute lines for consistency**

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/skills/vision/resources/intake.md \
  .agents/skills/designbook/skills/design-screen/resources/intake.md \
  .agents/skills/designbook/design/resources/reference-intake.md \
  .agents/skills/designbook/design/resources/write-planning.md \
  .agents/skills/designbook/skills/extract-reference/resources/intake.md
git commit -m "feat(skills): ephemeral vision, design modes, reference approval gate"
```

---

### Task 5: GAIA integration — `designbook-gaia`

**Files:**
- Modify: `.agents/skills/designbook-gaia/skills/debo-designbook-design/SKILL.md`
- Modify: `.agents/skills/designbook-gaia/SKILL.md` if the index restates auto-execute
- Optionally mirror notes in `docs/gaia/designbook-61/`

**Outside** designbook-skill-creator guardrail (GAIA step prose only).

- [ ] **Step 1: Spec step** — may record mode + ReferenceNeed; still must not invoke an auto-executing intake; may point at extract-reference as a separate start

- [ ] **Step 2: Coding step** — if a durable plan path exists from persist handoff, run `execute-workflow` only; do not re-intake into auto-execute. If references pending, do not start design execute

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-gaia/
git commit -m "feat(gaia): consume persisted plans; split extract and design starts"
```

---

### Task 6: debo-test fixtures — representative cases

**Files:**
- Extend or add under `fixtures/drupal-petshop/` and/or `fixtures/drupal-web/`:
  - vision ephemeral assertion (artifact present; durable plan absent/cleaned)
  - design-screen bounded update preservation (reuse/extend `design-screen-update.yaml`)
  - persist-without-execute case (plan exists; execute outputs not written)
  - reference approval approve + reject paths (likely `drupal-web` + extract-reference)
- Modify tester expectations only as required for new assertions

- [ ] **Step 1: Author/adjust case YAML and assertions**

- [ ] **Step 2: Run from this worktree**

```bash
# examples — exact suite/case names as authored
debo-test run drupal-petshop vision
debo-test run drupal-petshop design-screen-update
# plus new cases for persist and approval
```

Expected: PASS for green paths; reject path asserts blockade / no design execute.

- [ ] **Step 3: Commit fixtures + any tester doc updates**

```bash
git add fixtures/ .agents/skills/designbook-test/
git commit -m "test(debo-test): ephemeral, persist, and reference-approval cases"
```

---

### Task 7: Final consistency + `pnpm check`

- [ ] **Step 1: Grep for stale “invoke execute-workflow … automatically” that contradict modes**

```bash
rg -n "automatically" .agents/skills/designbook --glob '**/intake.md'
```

Fix stragglers.

- [ ] **Step 2: Run `pnpm check`**

Expected: PASS.

- [ ] **Step 3: Update `docs/gaia/designbook-61/` coding evidence notes if useful; final commit**

```bash
git add docs/gaia/designbook-61/
git commit -m "docs(gaia): DESIGNBOOK-61 implementation evidence pointers"
```

---

## Spec coverage checklist

| AC | Plan coverage |
|---|---|
| AC-1 Spec with responsibilities, modes, contracts, examples | Design doc + this plan |
| AC-2 vision + bounded scene without durable plan | Tasks 1, 3, 4, 6 |
| AC-3 explicit persist, no execute; extract/approval separate | Tasks 3–6 |
| AC-4 ask on rebuild; escalate via blockade + examples | Tasks 3, 4, 6 |
| AC-5 ReferenceNeed; GAIA routes; no Designbook scheduler | Tasks 4, 5 |
| AC-6 approval.yml; cannot skip; reuse; invalidate on change | Tasks 2, 4, 6 |
| AC-7 standalone = same contracts; no duplicate engines | D2 throughout |
| AC-8 resume / blockade / no silent scope expand | Tasks 3, 4 |
| AC-9 CLI/skills/GAIA/fixtures consistent; pnpm check | Tasks 6–7 |
| AC-10 no migrations | Global constraint |

## Out of scope for coding agents

- Transitioning the GAIA ticket (parent owns confirmation + transition).
- Implementing product SDC screens unrelated to these contracts.
- Reviving legacy `--plan` / `--from-plan` interactive plan-mode from 2026-07-01 designs.
