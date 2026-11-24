---
title: Outtake
trigger:
  steps: [sync-to:outtake]
params:
  type: object
  properties:
    scene:
      type: string
      default: ""
      description: >
        Scene id (SceneDef.name) of a scene run — keys the config-derived page URL
        lookup. Empty on a config/data-model run (then no page_url is emitted).
    backend_cmd:
      type: object
      resolve: backend_cmd
      description: >
        Backend command strings from designbook.config.yml. Provides page_url_cmd
        for a Scene run (substitute the scene id → prints the synced page's URL).
        Run opaquely — no backend knowledge lives in this task.
      properties:
        page_url_cmd:
          type: string
          description: >
            Command template that prints the reachable URL of a synced page; substitute the
            scene id for the `{scene}` placeholder. Used only on the Scene path — keyed by the
            scene id, since a Scene sync creates no content.
result:
  type: object
  required: [summary]
  properties:
    summary:
      $ref: ../schemas.yml#/ExportSummary
---

# Outtake

Assemble the `ExportSummary` from this workflow's own written-file results and
submit it as the task result.

## Result: summary

The written files come from the workflow's task results in scope — no params are
passed in for them:

- `unit_names` is the sorted list of unit `name` values sourced from the
  `transform` stage results (one `output-file` result per unit produced in that stage).
- `count` is the total number of files written, derived from the same `transform`
  stage results.
- `presenter_templates` is the sorted list of presenter-template paths the `transform` stage
  wrote for `template: presenter` surfaces — empty when no surface needed one. It makes the
  contract widening (config, plus a presenter-template) visible in the summary.
- `uncovered_units` is the list of unit names the `transform` stage recorded as
  blueprint-precedence stage-4 hits (authored without a matching blueprint). Empty in the normal case;
  a non-empty list is the reported signal that a unit kind lacks a covering blueprint — surface
  it, do not swallow it.
- `page_url` is set only on the scene branch (`scene` is set): run `page_url_cmd` with the
  scene id substituted for the `{scene}` placeholder and record the printed URL — the reachable
  URL of the page this run synced (expected HTTP 200). Omit it on a data-model run. Also omit it
  (do not fail the stage) when the command prints nothing — the page may not exist yet on the
  first run.
