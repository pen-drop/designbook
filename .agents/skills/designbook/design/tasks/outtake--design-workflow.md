---
name: designbook:design:outtake--design-workflow
title: "Outtake: Design Workflow"
trigger:
  steps: [design-shell:outtake, design-screen:outtake]
params:
  type: object
  properties:
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
      default: ""
    reference_folder:
      $ref: ../schemas.yml#/ReferenceFolder
      default: ""
    issues:
      type: array
      default: []
      items:
        $ref: ../schemas.yml#/Issue
    compare_artifacts:
      type: array
      default: []
      items:
        $ref: ../schemas.yml#/CompareArtifact
    breakpoints:
      type: array
      default: []
      items:
        $ref: ../schemas.yml#/BreakpointId
    regions:
      type: array
      default: []
      items:
        $ref: ../schemas.yml#/RegionId
result:
  type: object
  required: [workflow_output]
  properties:
    workflow_output:
      $ref: ../schemas.yml#/DesignWorkflowOutput
---

# Outtake — Design Workflow

Summarize the completed design workflow in one `workflow_output` payload.

Use the schema documentation on `designbook/workflow/schemas.yml#/WorkflowOutput`
and `DesignWorkflowOutput` as the source of truth for field meaning. Keep this
task focused on collecting the current run facts and computing the final
`success_rate`.

## Execution

1. Read the current workflow state and the results of earlier stages.
2. Populate the generic run metrics under `workflow_output.metrics`.
3. Populate any design-review fields available for this run:
   - `compare_passed`
   - `diff_path`
   - `issues_count`
   - `breakpoints_checked`
   - `regions_checked`
   - `reference_folder`
4. Derive `compare_passed`, `issues_count`, and the most relevant `diff_path`
   from the aggregated `compare_artifacts` and `issues`.
5. Compute `success_rate` from the workflow's actual design outcome. A
   technically completed run may still have a reduced `success_rate` when
   compare results, open issues, or validation failures indicate incomplete
   quality.
6. Return a short `summary`, any non-fatal `warnings`, and relevant `artifacts`.

Do not perform capture or compare work here. The preceding compare stages are
the source of truth for screenshot diffs and issues; this task only assembles
the final workflow output.

## Note

`flow_rate` and `workflow_output.metrics` (errors, retries, unresolved) are **not** written
by this task. The engine injects these values deterministically when archiving the workflow.
Only write `success_rate` (visual quality judgment) and the human-readable fields
(`summary`, `warnings`, `artifacts`, `compare_passed`, etc.).
