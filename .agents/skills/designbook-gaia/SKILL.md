---
name: designbook-gaia
description: >
  Use for GAIA design-to-designbook and designbook-to-config workflow steps.
  Requires the GAIA plugin.
---

# Designbook GAIA integration

Load the step-skill matching the ticket's work type:

| Work type | Skill | Default verification |
|---|---|---|
| `design-to-designbook` | [debo-designbook-design](skills/debo-designbook-design/SKILL.md) | `@designbook/design-verify` |
| `designbook-to-config` | [debo-config-sync](skills/debo-config-sync/SKILL.md) | `@designbook/sync-verify` |

Both handle `diagnose`, `spec`, `coding` and `review` for `gaia_feature`,
`gaia_bug` and `gaia_chore`. **Spec creates the reference and a sealed durable
plan; coding executes that plan.** Reference capture and approval finish before
dependent design planning. GAIA owns review evidence reuse, destination choice
and the merge gate.

## Project configuration

The step-skills follow `@gaia/workflow-step`. Preserve their `when` triples for
GAIA's coverage/collision validation. Project `WORKFLOW.md` input overrides
use `<role>.prompt` or `<role>.command` keys and replace defaults while preserving
the reference → plan → execute contract.

```markdown
## Loaded skills

- @designbook-gaia/debo-designbook-design
    provision.command: ddev init --provider recipe-test
- @designbook-gaia/debo-config-sync
    provision.command: ddev init --provider recipe-test
```

GAIA owns lifecycle helpers and recording configured measurements. The step-skills
reuse `@gaia/method-context` Coding and Review flows and `@gaia/workflow-step`
publication order. Designbook owns reference capture, planning,
execution and visual verification. For engineering-method selection through
`@gaia/method-context`, use [the skill map](references/designbook.md).
