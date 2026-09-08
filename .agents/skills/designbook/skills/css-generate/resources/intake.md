---
name: css-generate-intake
description: Domain decisions required before planning css-generate artifacts.
---

# css-generate intake

Read the tokens and effective CSS framework configuration. Enumerate source files, transforms and target CSS files. Decide whether missing transforms must be authored and identify their paths before planning generation and validation.

Use the request, existing project artifacts, and the saved discover catalogue as input. Ask only questions not answered by those inputs.

Completion: every target, structural parameter, dependency and applicable rule is determined. Record the complete decisions as definition inputs and concrete task parameters; intake itself creates no run task or progress entry.

Follow the [shared builder](../../../resources/workflow-building.md), then invoke [execute-workflow](../../execute-workflow/SKILL.md) with the saved document path automatically.
