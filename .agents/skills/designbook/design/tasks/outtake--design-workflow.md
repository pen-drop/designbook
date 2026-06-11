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
5. Compute `success_rate` **deterministically** from the measured compare
   results — never as a free judgment. For each artifact compute its
   `effective_deviation = max(diff_percent, severity_floor[severity])`, where the
   severity floors are `pass → 0.0`, `minor → 0.05`, `major → 0.20`,
   `critical → 0.50`. Then `success_rate = 1 − max(effective_deviation)` across all
   `compare_artifacts` (clamp to `[0, 1]`). Both `diff_percent` and `severity` come
   from the `compare-images` CLI, so the severity floor folds the CLI's structural
   signals (spatial extent, dimension drift) into the score — a widely-spread shift
   with low `diff_percent` but `severity: major` still costs at least `0.20`, rather
   than reading as near-perfect. Treat any artifact whose measurement is incomplete
   as a full failure, not as absent — `effective_deviation = 1.0` when an artifact
   has no `diff_percent` **or** no `severity` (the compare could not run or the CLI
   output was not carried through: empty `story_url`, missing screenshot, capture
   failure). A missing severity must never silently default to floor `0`.
   Identical screenshots always yield the same score, independent of which model
   ran the workflow. Then handle the no-measurement edges:
   - **No design reference at all** (`reference_folder` empty → no checks were ever
     configured): visual fidelity is genuinely unmeasured → `success_rate = 1.0`.
   - **A `reference_folder` was set but `compare_artifacts` is empty**: compare was
     expected but produced nothing → `success_rate = 0.0`, never default to perfect.
   - **Fewer artifacts than the configured check matrix** (`breakpoints[] × regions[] ×
     states`): each expected-but-absent check counts as `effective_deviation = 1.0`,
     so dropping the worst check cannot raise the score.
6. Return a short `summary`, any non-fatal `warnings`, and relevant `artifacts`.

Do not perform capture or compare work here. The preceding compare stages are
the source of truth for screenshot diffs and issues; this task only assembles
the final workflow output.

## Note

`flow_rate` and `workflow_output.metrics` (errors, retries, unresolved) are **not** written
by this task. The engine injects these values deterministically when archiving the workflow.
Only write `success_rate` (computed deterministically from `compare_artifacts`
per step 5 — measured, not judged) and the human-readable fields
(`summary`, `warnings`, `artifacts`, `compare_passed`, etc.).
