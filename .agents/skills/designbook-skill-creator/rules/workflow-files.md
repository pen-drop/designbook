---
name: workflow-files
description: Author workflow templates and their intake/executor boundaries. Load when editing workflows/*.md.
applies-to: ["**/workflows/*.md"]
---

# Workflow templates

Load with [common rules](common-rules.md). The [shared builder](../../designbook/resources/workflow-building.md) owns the definition-building procedure; `workflow schema` owns its machine contract.

A domain skill is an intake outside the run. Its resource owns questions, reference analysis, structural inputs and handoff. It resolves the entire target inventory before invoking the shared builder, then automatically invokes `execute-workflow <path>`.

Templates contain executable building blocks, grouped by `stages: { name: { steps: [...] } }`. Task names are plain names; task discovery can qualify them with the template ID. Repetition is a prose hint to the planning agent, which writes each concrete task. Template stages never create runtime tasks.

Templates have `title`, `description`, optional input descriptions in `params`, and `stages`. They contain no intake stages, interactive stages, runtime repetition or before/after hooks. Conditional prerequisite work is decided during intake and incorporated into the fixed definition.

```yaml
---
title: Design Component
description: Produce the component artifacts selected during intake
stages:
  component:
    steps: [create-component]
---
```

Completion: the template describes only artifact work; structural decisions live in intake; the generated document embeds every task instruction, applicable constraint, blueprint, configuration instruction and validation schema. Execution reads only that definition and updates its separate state.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| WORKFLOW-01 | error | Step names are plain names | frontmatter |
| WORKFLOW-02 | error | No intake/interactive stages, each, before or after declarations | frontmatter |
| WORKFLOW-03 | error | Domain intake invokes the shared builder and saved-path executor | intake resource |
