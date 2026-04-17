---
trigger:
  steps: [run-workflow]
params:
  type: object
  required: [workflow]
  properties:
    workflow:
      type: object
      $ref: ../schemas.yml#/ImportWorkflow
each:
  workflow:
    expr: "workflow"
    schema: { $ref: ../schemas.yml#/ImportWorkflow }
---

# Task: Run Sub-Workflow

Executes a sub-workflow as part of the import orchestration. The parent import workflow iterates over a list of sub-workflows; this task handles one entry.

## Instructions

1. **Announce** which sub-workflow is about to start:

   > "Starting sub-workflow: **{{ workflow.workflow }}**"

2. **Start the sub-workflow** using standard workflow execution (Phase 0 → Phase 1 → Phase 2).

3. **Pre-fill intake params** from `{{ workflow.params }}`. When the sub-workflow's intake asks for information that is already provided in the pre-filled params, use those values as defaults. Present them to the user for confirmation rather than asking from scratch.

4. **Execute the sub-workflow normally** — follow all standard execution rules (Rules 0–7 from `workflow-execution.md`). The sub-workflow has its own lifecycle, its own `tasks.yml`, and its own task tracking.

5. **On completion** of the sub-workflow, return control to the parent import workflow.

## Constraints

- Each sub-workflow runs with full user interaction — do not skip intake confirmation
- Pre-filled params are defaults, not overrides — the user can modify them
- If a sub-workflow fails, pause and report the error to the user rather than skipping to the next one
- Follow the standard workflow execution rules for the sub-workflow — it is a complete workflow, not a shortcut
