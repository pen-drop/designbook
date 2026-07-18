# designbook — WORKFLOW

Per-state **policy overrides** for this repo, consumed by the `gaia` skill. Each `## State: <state>`
section carries a YAML config object with **only the keys this project overrides**; every omitted
key (and every empty section) takes the engine default.

- **Schema, vocabularies, engine defaults, and the defaults-⊕-overrides merge rule** live in the
  skill: `.claude/skills/gaia/reference/workflow-config.md`.
- **Mechanics** (dispatch, auth, payload shapes, merge signature, phase-comment + acceptance→test→
  .feature lifecycle) live in `.claude/skills/gaia/SKILL.md` + `reference/**`.
- **No** general prose, decision tables, dropsh `--data` JSON, or step-by-step HOW belong in this
  file — only this project's overrides. Validate with the `gaia` skill's `workflow:validate` workflow.

In practice the only project-specific content is the enabled **aspects** below (cross-cutting
behaviour, ≥ 2 states) and the per-state **prose tooling bullets** (`- if …: …`, single-state
build/verify tooling) under each `## State:` section.

## Aspects

```yaml
# designbook IS the design surface: the `design` aspect drives every UI artifact through the
# `debo` skill (design-entity | design-component | sections | design-screen) — planned in spec
# (--plan), executed in coding (--from-plan). No hand-coded components.
aspects:
  - name: design
```

## State: triage

```yaml
# defaults suffice
```

## State: spec

```yaml
# ui_or_design handled by the `design` aspect (plan UI artifacts with `debo` in --plan mode)
# debo-test task-kind — a tester ticket records its target suite/case + validate workflow here; no design planning.
```

- if the ticket targets a debo-test suite/case (a designbook-test tester run, not a UI/design change): determine and record the target debo-test `<suite>` and `<case>`, plus which validate workflow to run after the main workflow (typically `design-verify`; "none" = no validate pass) — when unspecified, list options with `debo-test run <suite>` (no case arg) and confirm the pick. That recording is the whole spec — no design/component planning, and no BDD: the executable test IS `debo-test run <suite> <case>` (with `--validate <workflow>` when spec recorded one), so the `test` also-author comment just names that invocation (no Gherkin/`.feature`). Write `Task-Art: debo-test` into the spec comment so coding and review pick up the kind.

## State: diagnose

```yaml
# defaults suffice
```

## State: coding

```yaml
# ui_or_design handled by the `design` aspect (execute the spec's plans with `debo` --from-plan).
# The verify tooling below is designbook-specific. Any change to a designbook skill
# (workflow/task/rule/blueprint/schema) is verified through the matching `debo-test`
# tester — never ad-hoc — over the suite/case whose fixture exercises the change.
tasks:
  - when: the ticket's Task-Art is debo-test
    reasoning: []   # the work is running one fixed tester command, not writing code — TDD does not apply
```

- if the ticket's Task-Art is debo-test: run `debo-test run <suite> <case> --validate <workflow>` for the suite+case and validate workflow recorded by spec (append `--validate` only when spec recorded one) — never ad-hoc — and capture the tester output (the `workflow summary --json` block). Do not hand-edit skill files. Run the tester from a plain checkout, NOT from inside a git worktree (its setup does `git reset --hard`/`git clean -fd`).
- if the change has a runtime surface: verify it end-to-end through the matching `debo-test` tester (never ad-hoc) — pick the suite/case whose fixture exercises the changed skill and run `debo-test run <suite> <case>` for a single functional pass, or `debo-test research <suite> <case> --baseline-only` for a scored audit; the tester provisions the test workspace (and, for a Drupal `sync-*` case, the live Drupal target via `start-drupal-workspace.sh`) and exercises the changed workflow. If no fixture exercises the change yet, author it first. Run `pnpm check` (typecheck → lint → test) in addition when the change touches the addon/TS. NOTE: `debo-test`'s setup scripts run `git reset --hard`/`git clean -fd` and assume the workspace theme dir is its own git repo; run the tester from a plain checkout, not from inside a git worktree, until that isolation is guarded.
- on app change: run `pnpm check` (typecheck → lint → test, fail-fast) from the repo root.
- on conductor change: run `pnpm check` (typecheck → lint → test, fail-fast) from the repo root.

## State: review

```yaml
# defaults suffice for non-debo-test tickets (green_pipeline gate, confirm-gate, ok→done / not_ok→coding)
```

- if the ticket's Task-Art is debo-test: decide — and document the decision in the summary — whether an additional `debo-test research <suite> <case> --baseline-only` (scored audit) pass is warranted beyond coding's `run`. Post the `summary` comment holding the tester/workflow results (run outcome + any research score); that comment is the write-back to the ticket. A debo-test ticket may have no MR/diff — gate on the tester result, not a pipeline.
