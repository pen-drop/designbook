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
behaviour, ≥ 2 states) and the per-state `sub_decisions` `then` actions (single-state build/verify
tooling).

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
```

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
sub_decisions:
  - if: runtime_surface
    then: verify the change end-to-end through the matching `debo-test` tester (never ad-hoc) — pick the suite/case whose fixture exercises the changed skill and run `debo-test run <suite> <case>` for a single functional pass, or `debo-test research <suite> <case> --baseline-only` for a scored audit; the tester provisions the test workspace (and, for a Drupal `sync-*` case, the live Drupal target via `start-drupal-workspace.sh`) and exercises the changed workflow. If no fixture exercises the change yet, author it first. Run `pnpm check` (typecheck → lint → test) in addition when the change touches the addon/TS. NOTE: `debo-test`'s setup scripts run `git reset --hard`/`git clean -fd` and assume the workspace theme dir is its own git repo; run the tester from a plain checkout, not from inside a git worktree, until that isolation is guarded.
  - if: app_change
    then: run `pnpm check` (typecheck → lint → test, fail-fast) from the repo root
  - if: conductor_change
    then: run `pnpm check` (typecheck → lint → test, fail-fast) from the repo root
```

## State: review

```yaml
# defaults suffice (green_pipeline precondition, confirm-gate, ok→done / not_ok→coding)
```
