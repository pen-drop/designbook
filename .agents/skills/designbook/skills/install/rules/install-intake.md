---
name: install-intake
description: Domain decisions required before planning install artifacts.
trigger:
  steps: [install:intake]
---

# install intake

When no project config exists, record the chosen effective configuration in a temporary JSON planning input and use `intake install --config <path>`; creating the real project config remains an execution task.

Inspect the project root, package manager, framework/backend, target directories and existing Storybook setup. Resolve installation scope, config paths, dependencies and verification commands. Determine every setup target before planning writes; use the discovered effective integration guidance.

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes.
