# designbook — WORKFLOW

Per-state **policy** for this repo, consumed by the `gaia` skill. Form: the `## Aspects` list
(+ optional `with:`), optional mini-YAML knobs per `## State: <state>`, and prose tooling
bullets. **Override rule: every YAML key set here replaces the engine default completely —
scalar or list, no append.** Omitted keys and empty sections take the engine default (SKILL.md
state table); the HOW lives in the skill (`aspects/`, `workflows/`, `reference/`).

## Aspects

```yaml
# designbook IS the design surface: the `designbook` aspect owns every UI artifact through the
# `debo` skill — planned in spec (--plan), executed in coding (--from-plan). No hand-coded components.
aspects:
  - name: designbook
```

## State: triage
# defaults suffice

## State: spec
# UI/design planning is owned by the `designbook` aspect. Project-specific below: the debo-test tester ticket.

- if the ticket targets a debo-test suite/case (a designbook-test tester run, not a UI/design change): determine and record the target debo-test `<suite>` and `<case>`, plus which validate workflow to run after the main workflow (typically `design-verify`; "none" = no validate pass) — when unspecified, list options with `debo-test run <suite>` (no case arg) and confirm the pick. That recording is the whole spec — no design/component planning, and no BDD: the executable test IS `debo-test run <suite> <case>` (with `--validate <workflow>` when spec recorded one), so the `test` also-author comment just names that invocation (no Gherkin/`.feature`). Write `Task-Art: debo-test` into the spec comment so coding and review pick up the kind.

## State: diagnose
# defaults suffice

## State: coding
# UI/design execution is owned by the `designbook` aspect (debo --from-plan). The verify tooling
# below is designbook-specific: any change to a designbook skill (workflow/task/rule/blueprint/schema)
# is verified through the matching `debo-test` tester — never ad-hoc — over the suite/case whose
# fixture exercises the change.

```yaml
tasks:
  - when: the ticket's Task-Art is debo-test
    reasoning: []   # the work is running one fixed tester command, not writing code — TDD does not apply
```

- if the ticket's Task-Art is debo-test: run `debo-test run <suite> <case> --validate <workflow>` for the suite+case and validate workflow recorded by spec (append `--validate` only when spec recorded one) — never ad-hoc — and capture the tester output (the `workflow summary --json` block). Do not hand-edit skill files. Run the tester from **inside the ticket's git worktree**, never a shared plain checkout: each worktree owns its own `workspaces/` tree, so parallel same-suite runs (e.g. an A/B across agents on the same case) stay isolated and cannot clobber each other via the setup `rm -rf workspaces/<suite>`. The setup `git reset --hard`/`git clean -fd` targets only the workspace theme dir (its own git repo) and is fenced by a git-toplevel assert in `setup-test.sh`, so it never reaches the enclosing worktree.
- if the change has a runtime surface: verify it end-to-end through the matching `debo-test` tester (never ad-hoc) — pick the suite/case whose fixture exercises the changed skill and run `debo-test run <suite> <case>` for a single functional pass, or `debo-test research <suite> <case> --baseline-only` for a scored audit; the tester provisions the test workspace (and, for a Drupal `sync-*` case, the live Drupal target via `start-drupal-workspace.sh`) and exercises the changed workflow. If no fixture exercises the change yet, author it first. Run `pnpm check` (typecheck → lint → test) in addition when the change touches the addon/TS. NOTE: run the tester from inside the ticket's git worktree (isolated `workspaces/` per ticket — the collision guard for parallel same-suite runs). `debo-test`'s setup `git reset --hard`/`git clean -fd` targets only the workspace theme dir (its own git repo) and `setup-test.sh` asserts that dir is its own git toplevel before resetting, so it is safe inside a worktree and never touches the enclosing checkout.
- on app change: run `pnpm check` (typecheck → lint → test, fail-fast) from the repo root.
- on conductor change: run `pnpm check` (typecheck → lint → test, fail-fast) from the repo root.

## State: review
# defaults suffice for non-debo-test tickets (green_pipeline gate, confirm-gate, ok → done / not_ok → coding)

- if the ticket's Task-Art is debo-test: decide — and document the decision in the summary — whether an additional `debo-test research <suite> <case> --baseline-only` (scored audit) pass is warranted beyond coding's `run`. Post the `summary` comment holding the tester/workflow results (run outcome + any research score); that comment is the write-back to the ticket. A debo-test ticket may have no MR/diff — gate on the tester result, not a pipeline.
