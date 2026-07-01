---
title: "Sync config to Drupal"
trigger:
  steps: [sync-to:sync]
params:
  type: object
  required: [config_sync_dir]
  properties:
    config_sync_dir:
      type: string
      description: Absolute path to the Drupal config-sync directory containing the written YAML files.
      resolve: config_sync_dir
result:
  type: object
  required: [sync-result]
  properties:
    sync-result:
      $ref: ../schemas.yml#/SyncResult
---

# Sync

Apply the config-sync directory to the live Drupal site by running:

```
drush config:import --partial --source={{ config_sync_dir }} -y
```

Capture stdout, stderr, and the exit code.

**On a non-zero exit code:**

- If `scope.validation_gate` is `'soft'` (eval/gradient-scoring mode) — record the outcome in `sync-result` and **continue**. The scorer needs the result even on failure.
- Otherwise (`scope.validation_gate` is `'hard'` or absent) — record `drush_summary` and `cim_ok: false`, then **abort** the stage immediately and surface the drush output as the failure reason.

## Result: sync-result

- `drush_summary`: the complete captured stdout/stderr from the drush invocation.
- `applied_config_names`: the list of config names that drush reported as imported during this run, parsed from the drush output.
- `cim_ok`: `true` if `drush config:import --partial` exited 0; `false` otherwise.
