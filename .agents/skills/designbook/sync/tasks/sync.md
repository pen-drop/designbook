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

On non-zero exit code: STOP immediately and surface the full drush output verbatim. Do not continue or swallow the error.

## Result: sync-result

- `drush_summary`: the complete captured stdout/stderr from the drush invocation.
- `applied_config_names`: the list of config names that drush reported as imported during this run, parsed from the drush output.
