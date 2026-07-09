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
# The verify tooling below is designbook-specific: a real Storybook test workspace + `pnpm check`.
sub_decisions:
  - if: runtime_surface
    then: verify the built design artifacts render — build a designbook test workspace with `./scripts/setup-workspace.sh <name>`, confirm the components load in the running Storybook, then run `pnpm check` (typecheck → lint → test)
  - if: app_change
    then: run `pnpm check` (typecheck → lint → test, fail-fast) from the repo root
  - if: conductor_change
    then: run `pnpm check` (typecheck → lint → test, fail-fast) from the repo root
```

## State: review

```yaml
# defaults suffice (green_pipeline precondition, confirm-gate, ok→done / not_ok→coding)
```
