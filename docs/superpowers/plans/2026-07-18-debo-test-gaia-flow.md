# debo-test GAIA task-kind flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `debo-test` GAIA task-kind so tickets that run/audit a debo-test suite follow a light spec→coding→review flow whose results are written back to the ticket.

**Architecture:** Task-Art + aspect. `WORKFLOW.md` (designbook repo) enables a new `debo-test` aspect and adds a `tasks[].when` entry that routes coding to the debo-test tooling with trimmed reasoning. `aspects/debo-test.md` (gaia skill repo) carries the cross-cutting per-state prose (spec picks suite+mode, coding runs the chosen mode, review summarizes + writes back).

**Tech Stack:** GAIA skill (Drupal JSON:API + `gaia` CLI), `debo-test` skill, Markdown/YAML config. No application code.

## Global Constraints

- No backend code, no compat/migration code — `WORKFLOW.md` + aspect prose only (CLAUDE.md).
- Ein-Ort-Regel: behaviour spanning ≥2 states lives in the aspect, never copied into state sections.
- Override rule: any YAML key in `WORKFLOW.md` replaces the engine default wholesale (no append).
- `WORKFLOW.md` carries only project overrides — no general prose/HOW/`--data` JSON.
- Validate every `WORKFLOW.md` edit with the gaia skill's `workflow:validate` workflow.
- Two repos: `WORKFLOW.md` = `/home/cw/projects/designbook`; aspect file = `/home/cw/projects/gaia/.claude/skills/gaia/aspects/`.

---

### Task 1: Confirm aspect resolution + the mode/reasoning override keys

**Files:**
- Read: `/home/cw/projects/gaia/.claude/skills/gaia/reference/workflow-config.md`
- Read: `/home/cw/projects/gaia/.claude/skills/gaia/aspects/designbook.md`
- Read: `/home/cw/projects/designbook/WORKFLOW.md`

Preflight, no writes. Resolves the two risks from the design before any file is authored.

- [ ] **Step 1: Confirm how an enabled aspect name maps to its file.** `WORKFLOW.md` enables `name: design` but the on-disk file is `aspects/designbook.md`. Determine the actual resolution rule (name→file). Record: does `debo-test` need `aspects/debo-test.md`, and is the current `design` entry a live bug to flag (do NOT fix here unless it blocks loading)?
- [ ] **Step 2: Confirm the coding reasoning-trim mechanism.** In `workflow-config.md`, find the exact key that trims the coding TDD reasoning gate for a task-kind (a `tasks[].when` entry + `reasoning:` override, or a `sub_decisions` branch). Write down the exact YAML shape to use in Task 3.
- [ ] **Step 3: Record findings** as a short note in the ticket working area (or the spec comment thread) so Tasks 2–3 use verified shapes, not guesses.

---

### Task 2: Author the `debo-test` aspect

**Files:**
- Create: `/home/cw/projects/gaia/.claude/skills/gaia/aspects/debo-test.md`

**Interfaces:**
- Produces: an aspect with `## spec:`, `## coding:`, `## review:` sections, enabled from `WORKFLOW.md` in Task 3 under the name confirmed in Task 1.

- [ ] **Step 1: Write the aspect file.** Prose only, no `--data` JSON. Content:

```markdown
# Aspect: debo-test

Owns the debo-test task-kind flow: choose a suite + run-mode up front in spec, execute exactly
that mode in coding via the `debo-test` skill (never ad-hoc), summarize the results back onto the
ticket in review.

## spec:

When the ticket is a debo-test run/audit (Task-Art `debo-test *`):
- Ask the human which debo-test **suite (+ case)** the ticket targets.
- Ask which **mode**, with a one-line explanation of each:
  - `run` — one functional pass (fastest; "does the workflow still work").
  - `research --baseline-only` — a single scored audit pass (no improvement loop).
  - `research` — full autonomous improvement loop (`--iterations/--target/--plateau`).
- Record the choice as `Task-Art: debo-test <mode>` in the spec comment; name the exact
  `debo-test <mode> <suite> <case>` invocation in the `# Plan`.
- No UI/design artifact is produced — the `designbook` aspect's spec section is skipped.

## coding:

Execute exactly the mode chosen in spec: `debo-test run|research <suite> <case>` (with the
recorded flags) from a plain checkout (never ad-hoc, never inside a git worktree — the tester's
setup runs `git reset --hard`/`git clean -fd`). Capture pass/fail, any score, and artifact paths.

## review:

Post the `summary` completion comment holding the debo-test results (invocation, pass/fail,
score, artifacts) — this is the write-back to the ticket. Optional fallback: if a `run` surfaced
problems, propose escalating to `research`; the primary mode decision stays in spec.
```

- [ ] **Step 2: Sanity-read** against the `designbook.md` aspect to match heading style + multi-state conventions.
- [ ] **Step 3: Commit** (gaia repo).

```bash
cd /home/cw/projects/gaia
git add .claude/skills/gaia/aspects/debo-test.md
git commit -m "feat(aspect): add debo-test task-kind aspect"
```

---

### Task 3: Wire `WORKFLOW.md` — enable aspect + Task-Art routing

**Files:**
- Modify: `/home/cw/projects/designbook/WORKFLOW.md` (`## Aspects` and `## State: coding`)

**Interfaces:**
- Consumes: the aspect name (Task 1/2) and the reasoning-trim YAML shape (Task 1).

- [ ] **Step 1: Enable the aspect.** In `## Aspects`, add the `debo-test` aspect to the `aspects:` list next to `design` (exact enable form per the confirmed name).
- [ ] **Step 2: Add the Task-Art routing under `## State: coding`.** Add a `tasks:` entry whose `when:` matches the `Task-Art: debo-test *` line and whose `then` routes coding to `debo-test <mode> <suite> <case>` with trimmed reasoning (no TDD gate — a debo-test run is not a code change). Use the exact YAML shape confirmed in Task 1; keep it to project-override content only.
- [ ] **Step 3: Validate.** Run the gaia skill's `workflow:validate` workflow against `WORKFLOW.md`.

Expected: validation passes (no schema/merge errors).

- [ ] **Step 4: Commit** (designbook repo).

```bash
cd /home/cw/projects/designbook
git add WORKFLOW.md
git commit -m "feat(workflow): route debo-test task-kind to debo-test tooling"
```

---

### Task 4: End-to-end dry check

**Files:** none (verification only).

- [ ] **Step 1: Pick a real fixture suite/case** from the `debo-test` skill (`fixtures/<suite>/cases/<case>.yaml`) that exercises a debo workflow.
- [ ] **Step 2: Confirm the flow reads correctly.** Walk the three states against the ticket: spec would ask suite+mode and set `Task-Art: debo-test <mode>`; coding would resolve the `tasks[].when` match and run `debo-test <mode> <suite> <case>`; review would summarize + write back. Confirm each state's prose resolves with no dangling reference.
- [ ] **Step 3: Optionally exercise coding tooling** with a fast `debo-test run <suite> <case>` from a plain checkout to confirm the invocation named in the aspect is valid.
- [ ] **Step 4:** Record the verification outcome in the review `summary` at ticket close.
