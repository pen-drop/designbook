# GAIA

`designbook-gaia` is a marketplace plugin. It ships GAIA workflow-step skills for design-to-designbook and designbook-to-config tickets. It requires the GAIA plugin. It does **not** ship debo `tasks/`, `rules/`, `blueprints/`, `workflows/`, or `schemas.yml`. It sits outside the four-level model and outside the skill-creator guardrail that applies to those file types.

## Load the matching step skill

| Work type | Skill | Default verification |
|---|---|---|
| `design-to-designbook` | `debo-designbook-design` | `@designbook/design-verify` |
| `designbook-to-config` | `debo-config-sync` | `@designbook/sync-verify` |

Both handle `diagnose`, `spec`, `coding`, and `review` for `gaia_feature`, `gaia_bug`, and `gaia_chore`. Spec creates the reference and a sealed durable plan. Coding executes that plan. Reference capture and approval finish before dependent design planning.

WORKFLOW.md lists:

```markdown
## Loaded skills

- @designbook-gaia/debo-designbook-design
- @designbook-gaia/debo-config-sync
```

## What GAIA owns versus Designbook

GAIA owns lifecycle helpers, review evidence reuse, destination choice, and the merge gate. Designbook owns reference capture, planning, execution, and visual verification. Step selection goes through `@gaia/method-context` and the skill map in `designbook-gaia/references/designbook.md`, not through per-step invented inputs.

Preserve each step-skill's `when` triples. GAIA validates coverage and collisions from those triples.

This integration does not add `extensions: gaia` to `designbook.config.yml`. Enable it by loading the GAIA and designbook-gaia plugins in the agent, not by a debo extension id.
