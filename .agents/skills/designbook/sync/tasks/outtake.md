---
title: Outtake
trigger:
  steps: [sync-to:outtake]
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
  `write-config` stage results (one `config-file` result per `DrupalConfigEntity`
  written in that stage).
- `count` is the total number of config YAML files written, derived from the
  same `write-config` stage results.
