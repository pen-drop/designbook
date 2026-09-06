---
name: designbook-gaia
description: >
  Use for GAIA design-to-designbook and designbook-to-config work types.
  Do not use without the GAIA plugin or for unrelated workflow steps.
---

# designbook-gaia — GAIA step-skills for the Designbook work-types

This integration skill is the **home** of the two GAIA workflow-step skills that carry Designbook
domain knowledge. Designbook is the source of that knowledge (Designbook intake and execution, `design-verify` /
`sync-verify`, the Storybook and Drupal preview-module links, the `design_verify` /
`config_verify` measurements), so the skills live here rather than in the gaia plugin.

| Sub-skill | `work_type` | Steps | Validate | Load as |
|---|---|---|---|---|
| `debo-designbook-design` | `design-to-designbook` | `diagnose`, `spec`, `coding`, `review` | `debo design-verify` | `@designbook-gaia/debo-designbook-design` |
| `debo-config-sync` | `designbook-to-config` | `diagnose`, `spec`, `coding`, `review` | `debo sync-verify` | `@designbook-gaia/debo-config-sync` |

Both use scope specification in GAIA spec and the matching Designbook intake in coding.
The intake authors a complete workflow document and automatically invokes its executor.
Validation uses the matching verification intake after artifact production.

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

The `spec` input defaults to a written domain scope. The `build` input invokes the matching
Designbook intake with that scope; `validate` invokes `debo design-verify` or `debo sync-verify`.
Override an input only when the project requires a different implementation or verification task.
