# DESIGNBOOK-16 — debo-test GAIA task-kind flow (design)

## Goal

Model a **debo-test ticket** end-to-end as a GAIA task-kind: spec picks the target
`debo-test` suite (+case), coding runs the tester, review decides whether an extra
`debo-test research` pass is warranted and writes the results back to the ticket — with the
minimal per-state reasoning/tooling instead of the full design flow. The deliverable is an
edit to the designbook `WORKFLOW.md`; **no new backend code**.

## Chosen approach — WORKFLOW.md (Option A) + one aspect `## create:` section

Confirmed with the operator over two alternatives (a new `debo-test` **aspect** in the gaia
skill repo; a **hybrid**). Option A keeps the spec/coding/review flow in the one file the
ticket names and does not add a per-ticket gate check to every lifecycle state run.

**One deviation, operator-requested:** at ticket **create** time, when the human indicates a
debo-test run ticket, present a selection of **all** available tester cases to pick from. The
create flow reads project policy from exactly one place — the enabled aspects' `## create:`
sections (`workflows/create/ticket.md:6`); it never reads `WORKFLOW.md` `## State:` blocks.
So this single behavior must live in a `## create:` section on the existing (enabled)
`designbook` aspect — a gaia-skill-repo edit the ticket explicitly permits ("and, if needed,
the enabled aspects"). Everything else stays in `WORKFLOW.md`.

### Mechanism constraint that shapes the design

`tasks[].when` in `WORKFLOW.md` overrides **only the `reasoning` list**, and **only in
coding** (SKILL.md § Task-Art; `workflows/ticket/coding.md`). It cannot carry tooling. So:

- **Task-Art + `tasks[].when`** satisfies AC-1 literally *and* buys the coding reasoning
  economy (drop TDD — the work is running one fixed command, not writing code).
- **Per-state `sub_decisions` / prose bullets** carry the actual behavior (AC-2/3/4/5). These
  are the sanctioned home for single-state build/verify tooling in `WORKFLOW.md`.

### Task-Art value

`Task-Art: debo-test` — written by **spec** into its `spec` comment; matched by **coding**
against `tasks[].when`.

Chicken-and-egg note: Task-Art is spec's *output*, so spec's own behavior cannot be
Task-Art-gated. spec self-selects on **ticket content** ("this ticket targets a debo-test
suite/case"), records suite+case, and stamps `Task-Art: debo-test`. coding and review read
the stamped value.

### Create-time case selection (edit to the `designbook` aspect)

- **`aspects/designbook.md` — new `## create:` section** (gaia skill repo): *when the human
  indicates a debo-test run ticket, list all suites/cases the tester exposes (per suite,
  `debo-test run <suite>` with no case arg lists that suite's cases) and have them pick one;
  pre-fill the ticket briefing with the chosen `<suite> <case>` so spec only confirms it. Not
  a debo-test ticket → skip.* Self-gated exactly like the aspect's `## spec:` UI-surface skip.

### Per-state policy (edits to `WORKFLOW.md`)

- **`## State: spec`** — add a `sub_decisions` entry: *if the ticket targets a debo-test
  suite/case → determine and record the target `<suite>` and `<case>` (list options with
  `debo-test run <suite>` — no case arg — when unspecified); that recording is the whole spec,
  no design/component planning; write `Task-Art: debo-test`.* The `design` aspect's `## spec:`
  section already self-skips when there is no UI surface, so no conflict.
- **`## State: coding`** — add `tasks: [{ when: Task-Art is debo-test, reasoning: [] }]` (no
  TDD) and a `sub_decisions` entry: *if Task-Art is debo-test → run `debo-test run <suite>
  <case>` for the recorded suite+case (never ad-hoc), capture the tester output (workflow
  summary JSON); do not hand-edit skill files.* The existing `runtime_surface` /
  `app_change` / `conductor_change` sub_decisions stay — they cover *authoring* changes to
  skills, a different case from a debo-test *ticket*.
- **No BDD for this kind.** The executable test for a debo-test ticket **is**
  `debo-test run <suite> <case>` — there is no Gherkin/`.feature` suite. The `bdd` aspect is
  not enabled for designbook (only `design` is), so no AC↔scenario matrix or `.feature` build
  runs regardless. The spec `test` also-author comment (engine default) for a debo-test ticket
  therefore just names the tester invocation as the executable test — it authors no
  Feature/Scenario Gherkin. The spec-state prose says so explicitly.
- **`## State: review`** — replace "defaults suffice" with a `sub_decisions` entry: *if
  Task-Art is debo-test → decide, and document in the summary, whether an additional
  `debo-test research <suite> <case> --baseline-only` (scored audit) pass is warranted beyond
  coding's `run`; post the `summary` comment holding the run outcome (+ any research score).*
  review's completion comment is already `summary`, and posting it is the write-back to the
  ticket — AC-5 falls out of the normal comment mechanism.

## Acceptance mapping

| AC | Satisfied by |
|----|--------------|
| AC-1 defined + matched via `tasks[].when` | `Task-Art: debo-test` + coding `tasks[].when` entry |
| AC-2 spec records suite+case | spec `sub_decisions` entry |
| AC-3 coding runs `debo-test run <suite> <case>` (no ad-hoc) | coding `sub_decisions` entry |
| AC-4 review decides research + posts `summary` | review `sub_decisions` entry + default `summary` completion |
| AC-5 summary written back to ticket | the `summary` comment IS the write-back |
| (operator add) create offers all cases | `designbook` aspect `## create:` section |

## Risks / open points

1. **Softer than a schema gate.** `tasks[].when` only swaps reasoning; the light-spec / run /
   research-decision tooling is prose the run must evaluate, not a hard schema enforcement.
   Accepted — this is what `sub_decisions` is for, and mirrors the existing coding tooling.
2. **spec reasoning stays default.** `[brainstorming, writing-plans]` still nominally runs for
   a debo-test ticket (can't Task-Art-gate spec reasoning — the stamp doesn't exist yet). The
   spec prose says the planning is trivial for this kind, so the gate resolves fast; it is not
   removed.
3. **debo-test isolation caveat.** The tester's setup scripts run `git reset --hard` /
   `git clean -fd` and assume the theme dir is its own git repo — must run from a plain
   checkout, **not** from inside a git worktree (already flagged in the existing coding NOTE).
   The new coding sub_decision repeats the caveat.
4. **A debo-test ticket may produce no MR/diff** (the deliverable is a tester run, not a repo
   change). review's `green_pipeline` precondition then has nothing to gate on — review must
   gate on the tester result instead. Flagged for the review-state policy prose.

## Validation

Edit is validated in coding via the gaia skill's `workflow:validate` workflow and the
Gherkin scenarios authored in the `test` comment (grep-level assertions over the edited
`WORKFLOW.md` sections).
