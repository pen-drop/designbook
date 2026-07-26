# debo-test GAIA task-kind flow — Design

**Ticket:** DESIGNBOOK-16 · `gaia_chore` · state spec
**Date:** 2026-07-18

## What / Why

designbook skill changes are already verified through the `debo-test` tooling
(`debo-test run|research|is-clear`), but there is no GAIA **task-kind** that models a
"run/audit a debo-test suite" ticket end-to-end. Today such a ticket would fall through the
generic `design` flow — full brainstorming/plan overhead in spec, hand-wavy tooling in coding.

This introduces a dedicated **debo-test task-kind** so those tickets run a light, test-focused
per-state flow, and the test/audit results land back on the ticket automatically.

## Agreed flow (per GAIA state)

The decision **which mode to run is taken up-front in spec**, not deferred to review — spec
already knows the intent.

- **spec**
  - Ask the human (interactive) **which debo-test suite (+ case)** the ticket targets.
  - Ask which **mode**, with a short one-line explanation of each:
    - `run` — one functional pass (fastest; "does the workflow still work").
    - `research --baseline-only` — a single **scored audit** pass (no improvement loop).
    - `research` — full autonomous improvement loop (`--iterations/--target/--plateau`).
  - Record the choice as a `Task-Art: debo-test <mode>` line in the spec comment.
  - No full design brainstorming/plan overhead beyond selecting suite + mode.

- **coding**
  - Execute exactly the chosen mode: `debo-test <mode> <suite> <case>` (never ad-hoc).
  - Capture the tester output (pass/fail, score, artifacts).

- **review**
  - Post a `summary` comment holding the test/workflow results — this **is** the write-back to
    the GAIA ticket (standard completion-comment mechanism).
  - **Optional escalation (fallback):** if a `run` surfaced problems, review may propose
    escalating to `research`; the primary mode decision stays in spec.

## Approach — chosen

**Task-Art + aspect** (evaluated against alternatives below):

- **`WORKFLOW.md`** (designbook repo root):
  - enable the new aspect in `## Aspects` (`aspects: [ {name: design}, {name: debo-test} ]`).
  - add a `tasks:` entry under `## State: coding` whose `when:` matches the
    `Task-Art: debo-test *` line and points coding at the debo-test tooling with trimmed
    reasoning (a debo-test run is not a TDD code change).
- **`aspects/debo-test.md`** (gaia skill repo — see Location below): `## spec:`, `## coding:`,
  `## review:` sections carrying the cross-cutting behaviour above (≥2 states → aspect, per the
  Ein-Ort-Regel).

### Alternatives considered

- **Per-state `sub_decisions` only** — no aspect: spreads the same debo-test logic across three
  `## State:` sections, violating the Ein-Ort-Regel (≥2 states → aspect). Rejected.
- **Task-Art only, no aspect** — leaves the spec suite-question and review summary/write-back
  with no clear home (AC-2/AC-4 unanchored). Rejected.

## Location (cross-repo) — key finding

- `WORKFLOW.md` lives in the **designbook repo** (`/home/cw/projects/designbook/WORKFLOW.md`).
- Aspect files resolve from the **gaia skill repo**
  (`/home/cw/projects/gaia/.claude/skills/gaia/aspects/`), where the existing designbook-specific
  aspect already lives (`designbook.md`). The new `debo-test.md` goes there too.
- **This is a two-repo change.**

## Risks / open points

- **Aspect-name discrepancy:** `WORKFLOW.md` enables `name: design`, but the file on disk is
  `aspects/designbook.md` (no `aspects/design.md` in the gaia repo). Resolution of the current
  `design` aspect must be confirmed before wiring `debo-test`, so the new aspect actually loads.
  Do **not** fix the `design`/`designbook` mismatch as part of this ticket unless it blocks
  loading — flag it.
- **Validation:** run the gaia skill's `workflow:validate` after the `WORKFLOW.md` edit.
- **Reasoning override for coding:** confirm the exact key (`reasoning:` / `tasks[].when` +
  tooling) that trims the coding TDD gate for a debo-test task-kind, per
  `reference/workflow-config.md`.
- **No backend code / no compat code** — WORKFLOW.md + aspect prose only.
