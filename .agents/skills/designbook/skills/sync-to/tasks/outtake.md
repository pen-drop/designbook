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
      description: >
        Backend command strings from designbook.config.yml. Provides page_url_cmd
        for a Scene run (substitute the scene id → prints the config-derived page URL).
        Run opaquely — no drush/Drupal knowledge lives in this task.
      properties:
        page_url_cmd:
          type: string
          description: >
            Command template that prints the reachable URL of a synced page from its
            config-derived identity (Layout-Builder canonical entity URL / Display-Builder
            `page_layout` route); substitute the scene id for the `{scene}` placeholder.
            Used only on the Scene path — keyed by the scene id, since a Scene sync creates no content.
          examples: ["ddev drush designbook:page-url {scene}"]
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

The config files come from the workflow's task results in scope — no params are
passed in for them:

- `config_names` is the sorted list of `config_name` values sourced from the
  `transform` stage results (one `config-file` result per `config-name` unit
  produced in that stage).
- `count` is the total number of config YAML files written, derived from the
  same `transform` stage results.
- `presenter_templates` is the sorted list of theme-relative Twig paths the `transform` stage
  wrote for `template: presenter` surfaces — empty when no surface was theme-methods-only. It
  makes the contract widening (config, plus a presenter-template) visible in the summary.
- `uncovered_units` is the list of `config_name`s the `transform` stage recorded as
  blueprint-precedence stage-4 hits (authored from `prepared` alone). Empty in the normal case;
  a non-empty list is the reported signal that a unit kind lacks a covering blueprint — surface
  it, do not swallow it.
- `page_url` is set only on the scene branch (`scene` is set): run `page_url_cmd` with the
  scene id substituted for the `{scene}` placeholder and record the printed URL — the reachable,
  config-derived URL of the page this run synced (expected HTTP 200). Omit it on a
  config/data-model run. Also omit it (do not fail the stage) when the command prints nothing —
  a config-only sync creates no entity, so the page's canonical entity may not exist yet on the
  first run; the URL becomes resolvable once the page's canonical entity is present.
