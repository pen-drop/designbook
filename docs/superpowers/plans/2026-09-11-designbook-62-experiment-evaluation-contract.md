# DESIGNBOOK-62 Experiment Evaluation Contract — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a versioned experiment/evaluation contract over Promptfoo/debo-test so a single Task or Rule change is comparable across quality, flow, tokens, time, and tool calls with durable evidence and a Markdown+CLI surface.

**Architecture:** Contract layer on existing Promptfoo runners: committed `docs/experiments/<id>/experiment.yml` + `comparison.md`; gitignored `promptfoo/evidence/<id>/<run-id>/` for native logs, ledgers, judgments; measurement normalizer over current CLI usage adapters; `debo-test experiment` subcommands for report/judge; approval provenance modes; representative contract tests. No new runner, no Storybook addon, no GAIA scheduler changes, no legacy measurement migrations.

**Tech Stack:** Node ESM (`.mjs`) under `promptfoo/`; Vitest/`node --test` as used by existing promptfoo tests; Designbook-test skill markdown; YAML via `js-yaml`; TypeScript only if a helper must live in `packages/storybook-addon-designbook` (prefer promptfoo-side first).

**Spec:** `docs/superpowers/specs/2026-09-11-designbook-62-experiment-evaluation-contract-design.md`

## Global Constraints

- Run `pnpm check` (typecheck → lint → test, fail-fast) before commits that touch the addon/TS; for promptfoo-only `.mjs`, also run `node --test promptfoo/tests/*.test.mjs` (or the package’s existing promptfoo test entry) before commit.
- **No migration / backwards-compat / legacy-artifact readers.** Fresh runs only (repo rule + Spec non-goal).
- Before editing guarded skill files under `.agents/skills/designbook/` or `designbook-*/` (task/rule/blueprint/workflow/`schemas.yml`), load **`designbook-skill-creator`**. `designbook-test` skill prose is OK under its own skill; still keep HOW out of WHAT if touching designbook tasks.
- Reuse DESIGNBOOK-58 usage semantics (`usage_source`, `usage_scope`, unknown ≠ 0).
- Do not change the GAIA agent scheduler.
- Workspace cleanup must never delete `promptfoo/evidence/`.

## File map (create/modify)

| Path | Responsibility |
|---|---|
| `promptfoo/experiments/schema.mjs` | Load/validate `experiment.yml` (schema_version 1) |
| `promptfoo/experiments/envelope.mjs` | Run envelope + evaluations + final_positive rules |
| `promptfoo/experiments/usage-normalize.mjs` | Map provider usage → phase metrics; unknown handling; no double-count |
| `promptfoo/experiments/tool-ledger.mjs` | Append-only top-level tool-call ledger |
| `promptfoo/experiments/report.mjs` | Write/update `docs/experiments/<id>/comparison.md` |
| `promptfoo/experiments/judge.mjs` | Write `judgment.yml`; blind label support |
| `promptfoo/experiments/approval-provenance.mjs` | Tag interactive/recorded/simulated; non-promotion guards |
| `promptfoo/scripts/experiment-cli.mjs` | CLI entry for report/judge/validate |
| `promptfoo/tests/experiment-*.test.mjs` | Contract unit tests (AC-10 cases) |
| `.gitignore` | Add `promptfoo/evidence/` |
| `docs/experiments/README.md` | Authoring guide |
| `docs/experiments/_fixtures/...` | Minimal committed fixture experiment stubs for tests |
| `.agents/skills/designbook-test/SKILL.md` + `skills/experiment/` | Route `experiment` sub-skill |
| `fixtures/drupal-web/cases/extract-reference.yaml` | Stop silent real-approval; require provenance mode |
| `promptfoo/README.md` | Document evidence store + experiment commands |

---

### Task 1: Schema + envelope + final_positive

**Files:**
- Create: `promptfoo/experiments/schema.mjs`
- Create: `promptfoo/experiments/envelope.mjs`
- Create: `promptfoo/tests/experiment-schema.test.mjs`
- Create: `docs/experiments/_fixtures/minimal/experiment.yml` (tiny valid fixture)

**Interfaces:**
- Produces: `validateExperiment(doc) → { ok, errors[] }`; `createEnvelope({ experimentId, variant, case, ... })`; `computeFinalPositive(evaluations, { visual }) → boolean`

- [ ] **Step 1: Write failing tests**

Cover: valid minimal experiment; missing ticket fails; missing commit on variant fails; `final_positive` false when visual and human optical `pending`; false when human `rejected`; true only when static+flow ok and optical channels allow; non-visual marks optical `not_applicable` and can be finally positive without human judgment.

- [ ] **Step 2: Run tests — expect FAIL**

```bash
node --test promptfoo/tests/experiment-schema.test.mjs
```

Expected: FAIL (modules missing).

- [ ] **Step 3: Implement schema + envelope**

Implement schema_version 1 fields from Spec § Data model. `computeFinalPositive` encodes AC-8.

- [ ] **Step 4: Tests PASS**

```bash
node --test promptfoo/tests/experiment-schema.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add promptfoo/experiments/schema.mjs promptfoo/experiments/envelope.mjs \
  promptfoo/tests/experiment-schema.test.mjs docs/experiments/_fixtures/minimal/experiment.yml
git commit -m "$(cat <<'EOF'
feat(experiments): add experiment schema and final_positive rules

EOF
)"
```

---

### Task 2: Usage normalizer + tool ledger + unknown semantics

**Files:**
- Create: `promptfoo/experiments/usage-normalize.mjs`
- Create: `promptfoo/experiments/tool-ledger.mjs`
- Create: `promptfoo/tests/experiment-usage.test.mjs`
- Modify (read-only reuse): `promptfoo/providers/codex-usage.mjs` patterns / CSV column meanings

**Interfaces:**
- Produces: `normalizeUsage(raw, { source, scope }) → metrics | { status: 'unknown', reason }`; `sumPhaseMetrics(phases)` without double-counting cache/reasoning; `appendToolCall(ledgerPath, call)`; `summarizeToolLedger(path)`

- [ ] **Step 1: Write failing tests**

Cases from Spec/AC-4/AC-7: missing usage → unknown not 0; cache_read subset of input not added twice into total; parallel elapsed vs summed active both present and distinct; tool failure+retry counted; early abort with lower tokens does not yield `improved` savings verdict helper; false improvement when verify skipped.

- [ ] **Step 2: Run — expect FAIL**

```bash
node --test promptfoo/tests/experiment-usage.test.mjs
```

- [ ] **Step 3: Implement normalizer + ledger**

Top-level tool calls only; no invented inner CLI counts.

- [ ] **Step 4: Tests PASS + commit**

```bash
git add promptfoo/experiments/usage-normalize.mjs promptfoo/experiments/tool-ledger.mjs \
  promptfoo/tests/experiment-usage.test.mjs
git commit -m "$(cat <<'EOF'
feat(experiments): normalize native usage and tool ledgers with unknown semantics

EOF
)"
```

---

### Task 3: Durable evidence store + gitignore

**Files:**
- Create: `promptfoo/experiments/evidence-store.mjs`
- Create: `promptfoo/tests/experiment-evidence.test.mjs`
- Modify: `.gitignore` — add `promptfoo/evidence/`
- Create: `promptfoo/evidence/.gitkeep` **only if** the tree must exist empty without ignoring the keep file — prefer documenting mkdir-on-write and ignore the whole directory (no keep required).

**Interfaces:**
- Produces: `initRunEvidence({ experimentId, runId }) → evidenceRoot`; `writeEnvelope(root, envelope)`; `linkNativeLogs(root, paths)`; assert helper `evidenceSurvivesWorkspaceCleanup(workspaceDir, evidenceRoot)`

- [ ] **Step 1: Failing test** — create fake workspace + evidence; delete workspace; evidence files remain; envelope identity fields present.

- [ ] **Step 2: Implement store + gitignore**

- [ ] **Step 3: PASS + commit**

```bash
git add promptfoo/experiments/evidence-store.mjs promptfoo/tests/experiment-evidence.test.mjs .gitignore
git commit -m "$(cat <<'EOF'
feat(experiments): durable gitignored evidence store separate from workspaces

EOF
)"
```

---

### Task 4: Approval provenance + non-promotion guards

**Files:**
- Create: `promptfoo/experiments/approval-provenance.mjs`
- Create: `promptfoo/tests/experiment-approval-provenance.test.mjs`
- Modify: `fixtures/drupal-web/cases/extract-reference.yaml` — simulated path must set provenance `mode: simulated` and assertions must not claim real human approval
- Modify (as needed): extract-reference assert helper under `promptfoo/skills/...` if present

**Interfaces:**
- Produces: `writeApprovalProvenance(revisionOrEvidence, { mode: 'interactive'|'recorded'|'simulated', ... })`; `isRealHumanApproval(provenance) → boolean` (true only for interactive); `assertNotPromotedToOpticalJudgment(...)`

- [ ] **Step 1: Failing tests** — simulated cannot satisfy `isRealHumanApproval`; recorded cannot; interactive can; simulated approval must not set optical.human pass.

- [ ] **Step 2: Implement + update fixture so silent `approved` without provenance fails contract checks.

- [ ] **Step 3: PASS + commit**

```bash
git add promptfoo/experiments/approval-provenance.mjs \
  promptfoo/tests/experiment-approval-provenance.test.mjs \
  fixtures/drupal-web/cases/extract-reference.yaml
git commit -m "$(cat <<'EOF'
feat(experiments): tag reference approval modes; block simulated human promotion

EOF
)"
```

---

### Task 5: Report generator + judge CLI

**Files:**
- Create: `promptfoo/experiments/report.mjs`
- Create: `promptfoo/experiments/judge.mjs`
- Create: `promptfoo/scripts/experiment-cli.mjs`
- Create: `promptfoo/tests/experiment-report-judge.test.mjs`
- Create: `docs/experiments/README.md`

**Interfaces:**
- CLI: `node promptfoo/scripts/experiment-cli.mjs report <experiment-id>`; `… judge <evidence-run> --result <img> --reference <img> --status pass|fail|unclear --criteria <text> [--blind]`
- Produces: updates `docs/experiments/<id>/comparison.md`; writes `judgment.yml` under evidence run

- [ ] **Step 1: Failing tests** — report includes branch+experiment, ticket, variant commits, three levels, links to evidence; judge writes evaluator/time/criteria/rationale; open judgment keeps `final_positive` false; rejected likewise; model requested vs effective rows visible.

- [ ] **Step 2: Implement report + judge + CLI**

- [ ] **Step 3: PASS + commit**

```bash
git add promptfoo/experiments/report.mjs promptfoo/experiments/judge.mjs \
  promptfoo/scripts/experiment-cli.mjs promptfoo/tests/experiment-report-judge.test.mjs \
  docs/experiments/README.md
git commit -m "$(cat <<'EOF'
feat(experiments): Markdown comparison report and CLI human judge

EOF
)"
```

---

### Task 6: debo-test `experiment` sub-skill + README

**Files:**
- Create: `.agents/skills/designbook-test/skills/experiment/SKILL.md`
- Create: `.agents/skills/designbook-test/skills/experiment/resources/experiment.md`
- Modify: `.agents/skills/designbook-test/SKILL.md` — route table row for `experiment`
- Modify: `promptfoo/README.md` — evidence store, experiment commands, attended vs simulated approval

**Interfaces:**
- Skill routes `debo-test experiment report|judge|validate …` to the CLI; documents AC-11 interactive proof procedure (present screenshots → ask → pending → decide; reject blocks dependents).

- [ ] **Step 1: Author skill prose (WHAT + command map; HOW stays in resources)**

- [ ] **Step 2: Manual smoke** — `debo-test` index lists `experiment`; resource points at CLI

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-test/SKILL.md \
  .agents/skills/designbook-test/skills/experiment \
  promptfoo/README.md
git commit -m "$(cat <<'EOF'
docs(debo-test): add experiment sub-skill for report and judge flows

EOF
)"
```

---

### Task 7: Representative Task + Rule fixtures + AC-10 suite glue

**Files:**
- Create: `docs/experiments/_fixtures/task-change/experiment.yml` (task path + consuming case)
- Create: `docs/experiments/_fixtures/rule-change/experiment.yml` (rule path + consuming task case)
- Create: `promptfoo/tests/experiment-ac10.test.mjs` — orchestrates remaining AC-10 cases not covered earlier (reference mismatch blocks single-change claim; model swap factor visible; joint-rule note enforced)

**Interfaces:**
- Fixtures are **committed stubs** validating traceability fields (AC-2); they do not need a full live design run in unit tests. Live attended interactive extract-reference proof is documented in the experiment skill as an attended checklist (AC-11).

- [ ] **Step 1: Failing AC-10 glue tests for remaining cases**

- [ ] **Step 2: Implement assertions against schema/envelope/provenance/report helpers**

- [ ] **Step 3: Run full promptfoo experiment tests + `pnpm check`**

```bash
node --test promptfoo/tests/experiment-*.test.mjs
pnpm check
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/experiments/_fixtures/task-change docs/experiments/_fixtures/rule-change \
  promptfoo/tests/experiment-ac10.test.mjs
git commit -m "$(cat <<'EOF'
test(experiments): Task/Rule fixtures and remaining AC-10 contract cases

EOF
)"
```

---

### Task 8: Self-review against Spec ACs + final check

- [ ] **Step 1:** Walk Spec AC-1…AC-11; point each to a test or delivered artifact; fill any gap with a failing test then fix (no silent skips).
- [ ] **Step 2:** Confirm `.gitignore` has `promptfoo/evidence/`; confirm no legacy measurement migrator landed.
- [ ] **Step 3:** `pnpm check` + `node --test promptfoo/tests/experiment-*.test.mjs`
- [ ] **Step 4:** Commit any doc fixups; prepare MR summary linking Spec + Plan.

---

## Spec coverage checklist (plan author)

| AC | Task(s) |
|---|---|
| AC-1 | Spec (done) + Tasks 1–6 deliver the contract |
| AC-2 | Task 7 fixtures |
| AC-3 | Tasks 1, 5 |
| AC-4 | Task 2 |
| AC-5 | Tasks 1–2, 5 |
| AC-6 | Tasks 1, 7 (comparability fields + mismatch case) |
| AC-7 | Task 2 verdict helpers + report |
| AC-8 | Tasks 1, 5 |
| AC-9 | Tasks 3, 5, 6 |
| AC-10 | Tasks 1–2, 4, 7–8 + `pnpm check` |
| AC-11 | Tasks 4, 6 |

## Execution handoff

Plan complete at `docs/superpowers/plans/2026-09-11-designbook-62-experiment-evaluation-contract.md`. After GAIA Spec confirmation and transition to `coding`, prefer **subagent-driven-development** (one task per subagent, review between tasks) or inline **executing-plans**.
