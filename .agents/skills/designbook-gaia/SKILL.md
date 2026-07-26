---
name: designbook-gaia
description: >
  GAIA integration for Designbook — provides the two GAIA workflow-step skills
  that encode Designbook domain knowledge: `debo-designbook-design`
  (work_type design-to-designbook) and `debo-config-sync`
  (work_type designbook-to-config). Designbook is the sole owner of this
  knowledge (debo flags, design-verify/config-verify, Storybook & Drupal
  preview links, design_verify/config_verify measurements). Each step-skill is a
  nested sub-skill under `skills/<name>/`, addressable as
  `@designbook-gaia/<name>`. This skill ships only GAIA-step prose — it copies
  no gaia helper and is deliberately non-runnable without the gaia plugin loaded.
---

# designbook-gaia — GAIA step-skills for the Designbook work-types

This integration skill is the **home** of the two GAIA workflow-step skills that carry Designbook
domain knowledge. Designbook is the source of that knowledge (debo flags, `design-verify` /
`config-verify`, the Storybook and Drupal preview-module links, the `design_verify` /
`config_verify` measurements), so the skills live here rather than in the gaia plugin.

| Sub-skill | `work_type` | Steps | Validate | Load as |
|---|---|---|---|---|
| `debo-designbook-design` | `design-to-designbook` | `diagnose`, `spec`, `coding`, `review` | `debo design-verify` | `@designbook-gaia/debo-designbook-design` |
| `debo-config-sync` | `designbook-to-config` | `diagnose`, `spec`, `coding`, `review` | `debo config-verify` | `@designbook-gaia/debo-config-sync` |

Both follow **plan → build → validate**: `spec` runs the debo workflow with `--plan` to write the
plan and stop; `coding` runs it with `--from-plan` to build autonomously from that plan; `validate`
(`debo design-verify` / `debo config-verify`) checks the result.

## Contract

Both sub-skills follow the GAIA `@gaia/workflow-step` contract: frontmatter carries a `when:` triple
over `(work_type, workflow, step)` plus `inputs:` (each with a `description` + `default`); a
consuming project overrides any input inline under the skill's bullet in its `WORKFLOW.md`
(effective = override ?? default). The `when:` triples are fixed — the load-time coverage/collision
validator of `@gaia/initialize-project` / `@gaia/upgrade-project` requires every producible triple
exactly once, so do not change them.

## Cross-plugin dependency (intended)

The step bodies invoke **only** gaia helper skills — `@gaia/read-ticket`,
`@gaia/ensure-qualification`, `@gaia/provision-ddev`, `@gaia/run-intake`, `@gaia/implement-ticket`,
`@gaia/acceptance`, `@gaia/scenario`, `@gaia/verify`, `@gaia/diagnose-ticket`,
`@gaia/review-ticket`, `@gaia/run-outtake`, `@gaia/transition-ticket`,
`@gaia/publish-origin-status`, `@gaia/publish-origin-feedback`, `@gaia/merge-mr`. Those helpers stay
in the gaia plugin; `designbook-gaia` copies **none** of them. As a result this skill is
**deliberately non-runnable without the gaia plugin loaded** — that is by design, not a defect.

The `design_verify` / `config_verify` measurement definitions likewise stay in gaia
(`review-ticket/measurements/definitions/{design-verify,config-verify}.json`): they are gaia
measurement-subsystem artifacts consumed by the `@gaia/implement-ticket` / `@gaia/review-ticket`
machinery via that exact path. The ported bodies keep the reference verbatim.

## Consuming this skill from a project `WORKFLOW.md`

A project that runs designbook-to-config or design-to-designbook sub-works loads the two step-skills
and (optionally) overrides their inputs inline. Copyable block:

```yaml
## Loaded skills

- @designbook-gaia/debo-designbook-design
    provision: ddev init --provider recipe-test
- @designbook-gaia/debo-config-sync
    provision: ddev init --provider recipe-test
```

The `spec` / `build` / `validate` inputs default to the debo commands baked into each sub-skill
(`debo <workflow> --plan`, `debo <workflow> --from-plan <plan>`, `debo design-verify` /
`debo config-verify`); override any of them the same way if a project needs a different command.
