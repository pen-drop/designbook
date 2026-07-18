# debo-test GAIA task-kind flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire a `debo-test` GAIA task-kind into the designbook `WORKFLOW.md` so spec picks a suite/case, coding runs `debo-test run`, and review decides on a `debo-test research` pass and writes results back — with minimal per-state reasoning.

**Architecture:** Option A — all policy lives in `WORKFLOW.md`. A `Task-Art: debo-test` stamp plus a coding `tasks[].when` entry give the reasoning economy + AC-1; per-state `sub_decisions` prose carry the spec/coding/review tooling (AC-2/3/4/5). No new backend code, no new aspect.

**Tech Stack:** GAIA `WORKFLOW.md` policy (consumed by the `gaia` skill); `debo-test` tester (`.agents/skills/designbook-test`).

## Global Constraints

- Editing `WORKFLOW.md` IS the deliverable — **no new backend code**, no new aspect files.
- `tasks[].when` overrides **only `reasoning`, only in coding** — tooling must go in `sub_decisions`.
- Every `## State:` YAML block is an **override** (replaces the engine default completely — no append).
- `WORKFLOW.md` carries **only overrides** — no general prose, decision tables, or step-by-step HOW.
- Keep the existing `design` aspect and the existing coding `sub_decisions` (`runtime_surface` / `app_change` / `conductor_change`) intact.
- debo-test tester runs `git reset --hard` / `git clean -fd` — run it from a plain checkout, not a git worktree.

---

### Task 1: Add the debo-test task-kind to `WORKFLOW.md` (spec + coding + review)

**Files:**
- Modify: `WORKFLOW.md` — `## State: spec`, `## State: coding`, `## State: review` blocks
- Test: assertions run inline (grep over `WORKFLOW.md`) + `gaia` skill `workflow:validate`

**Interfaces:**
- Consumes: SKILL.md § Task-Art (`tasks[].when` → coding reasoning), `sub_decisions` schema.
- Produces: a `debo-test` Task-Art recognized by coding; spec/coding/review policy for the kind.

- [ ] **Step 1: Edit `## State: spec`** — replace the placeholder comment with a `sub_decisions` block:

```yaml
# ui_or_design handled by the `design` aspect (plan UI artifacts with `debo` in --plan mode)
# debo-test task-kind: a tester ticket records its target suite/case here; no design planning.
sub_decisions:
  - if: the ticket targets a debo-test suite/case (a designbook-test tester run, not a UI/design change)
    then: determine and record the target debo-test `<suite>` and `<case>` — when unspecified, list options with `debo-test run <suite>` (no case arg) and confirm the pick. That recording is the whole spec — no design/component planning, and no BDD: the executable test IS `debo-test run <suite> <case>`, so the `test` also-author comment just names that invocation (no Gherkin/`.feature`). Write `Task-Art: debo-test` into the spec comment so coding and review pick up the kind.
```

- [ ] **Step 2: Edit `## State: coding`** — add a `tasks` knob and one `sub_decisions` entry, keeping the three existing entries:

```yaml
tasks:
  - when: the ticket's Task-Art is debo-test
    reasoning: []   # the work is running one fixed tester command, not writing code — TDD does not apply
sub_decisions:
  - if: the ticket's Task-Art is debo-test
    then: run `debo-test run <suite> <case>` for the suite+case recorded by spec — never ad-hoc — and capture the tester output (the `workflow summary --json` block). Do not hand-edit skill files. Run the tester from a plain checkout, NOT from inside a git worktree (its setup does `git reset --hard`/`git clean -fd`).
  - if: runtime_surface
    then: <existing text — unchanged>
  - if: app_change
    then: <existing text — unchanged>
  - if: conductor_change
    then: <existing text — unchanged>
```

- [ ] **Step 3: Edit `## State: review`** — replace "defaults suffice" with a `sub_decisions` block:

```yaml
# defaults suffice for non-debo-test tickets (green_pipeline gate, confirm-gate, ok→done / not_ok→coding)
sub_decisions:
  - if: the ticket's Task-Art is debo-test
    then: decide — and document the decision in the summary — whether an additional `debo-test research <suite> <case> --baseline-only` (scored audit) pass is warranted beyond coding's `run`. Post the `summary` comment holding the tester/workflow results (run outcome + any research score); that comment is the write-back to the ticket. A debo-test ticket may have no MR/diff — gate on the tester result, not a pipeline.
```

- [ ] **Step 4: Assert AC-1 — Task-Art + `tasks[].when` present**

Run:
```bash
grep -n "Task-Art: debo-test" WORKFLOW.md
grep -n "when: the ticket's Task-Art is debo-test" WORKFLOW.md
```
Expected: a match under `## State: spec` (the stamp) and under `## State: coding` (the `tasks[].when`).

- [ ] **Step 5: Assert AC-2/3/4 — per-state tooling present**

Run:
```bash
grep -n "debo-test run <suite> <case>" WORKFLOW.md      # AC-3, in coding
grep -n "record the target debo-test" WORKFLOW.md        # AC-2, in spec
grep -n "debo-test research <suite> <case> --baseline-only" WORKFLOW.md  # AC-4, in review
```
Expected: one match each, in the right state block.

- [ ] **Step 6: Assert the existing coding sub_decisions survived**

Run:
```bash
grep -c "if: " WORKFLOW.md   # coding must still carry runtime_surface/app_change/conductor_change + the new one
grep -n "runtime_surface\|app_change\|conductor_change" WORKFLOW.md
```
Expected: the three original coding conditions still present.

- [ ] **Step 7: Validate the policy file**

Run the `gaia` skill's `workflow:validate` workflow against `WORKFLOW.md`.
Expected: valid — YAML parses, no dead keys (`hooks`/`inject`/`on_transition`/`test_target`), overrides well-formed.

- [ ] **Step 8: Commit**

```bash
git add WORKFLOW.md docs/superpowers/specs/2026-07-18-designbook-16-debo-test-task-kind-design.md docs/superpowers/plans/2026-07-18-designbook-16-debo-test-task-kind.md
git commit -m "feat(designbook-16): debo-test GAIA task-kind flow in WORKFLOW.md"
```

### Task 2: Add create-time case selection to the `designbook` aspect

**Files:**
- Modify: `<gaia-skill>/aspects/designbook.md` — add a `## create:` section (path: the gaia skill's `aspects/designbook.md`, e.g. `/home/cw/projects/gaia/.claude/skills/gaia/aspects/designbook.md`; confirm the live path at coding time)
- Test: assertion run inline (grep over the aspect file)

**Interfaces:**
- Consumes: `workflows/create/ticket.md:6` — create reads enabled aspects' `## create:` sections.
- Produces: create-time interview addition that lists tester cases for debo-test tickets.

- [ ] **Step 1: Add the `## create:` section** to `aspects/designbook.md` (place after `## spec:` or at the section order the file uses):

```markdown
## create:

When the human indicates a **debo-test run** ticket (a designbook-test tester run, not a
UI/design change): list all suites/cases the tester exposes — for each suite,
`debo-test run <suite>` with no case arg lists that suite's cases — and have them pick one.
Pre-fill the ticket briefing with the chosen `<suite>` and `<case>` so spec only confirms
it. Not a debo-test ticket → skip.
```

- [ ] **Step 2: Assert the create section is present**

Run:
```bash
grep -n "## create:" <gaia-skill>/aspects/designbook.md
grep -n "debo-test run <suite>" <gaia-skill>/aspects/designbook.md
```
Expected: the new `## create:` heading + the case-listing instruction.

- [ ] **Step 3: Commit** (separate repo — the gaia skill clone)

```bash
cd <gaia-skill-repo> && git add aspects/designbook.md && git commit -m "feat(designbook-16): create-time debo-test case selection"
```

> **Cross-repo note:** Task 2 edits the **gaia skill repo**, not the designbook worktree. Confirm the writable live path (a symlink target vs. a vendored copy) before editing; if the skill is vendored read-only, escalate rather than editing a generated copy.

## Self-Review

- **Spec coverage:** AC-1 → Steps 1-2 + 4; AC-2 → Step 1 + 5; AC-3 → Step 2 + 5; AC-4 → Step 3 + 5; AC-5 → Step 3 (summary = write-back). All five covered.
- **Placeholders:** the `<existing text — unchanged>` markers in Step 2 are deliberate — the three current coding sub_decisions are preserved verbatim, not rewritten.
- **Consistency:** `Task-Art: debo-test` string identical across spec (stamp) and coding (`tasks[].when`). Suite/case placeholders `<suite> <case>` consistent across coding + review.
