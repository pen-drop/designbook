---
name: install-intake
description: Domain decisions required before planning install artifacts.
---

# install intake

When no project config exists, record the chosen effective configuration in a temporary JSON planning input and use `workflow discover install --config <path>`; creating the real project config remains an execution task.

Inspect the project root, package manager, framework/backend, target directories and existing Storybook setup. Resolve installation scope, config paths, dependencies and verification commands. Determine every setup target before planning writes; use the discovered effective integration guidance.

Use the request, existing project artifacts, and the saved discover catalogue as input. Ask only questions not answered by those inputs.

Completion: every target, structural parameter, dependency and applicable rule is determined. Record the complete decisions as definition inputs and concrete task parameters; intake itself creates no run task or progress entry.

Follow the [shared builder](../../../resources/workflow-building.md), then invoke [execute-workflow](../../execute-workflow/SKILL.md) with the saved document path automatically.
