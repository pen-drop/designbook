---
title: Outtake
trigger:
  steps: [sync-to:outtake]
params:
  type: object
  properties:
    backend_cmd:
      type: object
      description: >
        Backend command strings from designbook.config.yml. Provides page_url_cmd
        for a Scene run (substitute the page's content_ref → prints the page URL). Run
        opaquely — no drush/Drupal knowledge lives in this task.
      properties:
        page_url_cmd:
          type: string
          description: >
            Command template that prints the reachable URL of a synced page; substitute
            the page unit's content_ref for the `{content_ref}` placeholder. Used only
            on the Scene path.
          examples: ["ddev drush eval \"print \\Drupal::service('entity.repository')->loadEntityByUuid('node','{content_ref}')->toUrl('canonical',['absolute'=>TRUE])->toString();\""]
    content_units:
      type: array
      default: []
      description: >
        The content units from resolve-filter (in scope). The `role: page` unit's
        content_ref keys the page URL lookup. Empty for a data-model run.
      items:
        $ref: ../schemas.yml#/ContentUnit
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
- `page_url` is set only for a `unit: scene` run: run `page_url_cmd` with the `role: page`
  unit's `content_ref` substituted for the `{content_ref}` placeholder and record the printed
  URL — the reachable URL of the page this run synced. Omit it for a `unit: data-model` run
  (no content units).
