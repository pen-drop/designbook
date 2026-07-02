---
title: "Sync config to Drupal"
trigger:
  steps: [sync-to:sync]
params:
  type: object
  required: [backend_cmd]
  properties:
    backend_cmd:
      type: object
      description: >
        Backend command strings from designbook.config.yml. Provides import
        (runs config-import against the backend's view of the config-sync
        directory).
      required: [import]
      properties:
        import:
          type: string
          description: >
            Complete command that imports the config-sync directory into the
            live backend. The engine runs this string opaquely — no
            drush/Drupal/path knowledge lives in this task.
          examples: ["ddev drush config:import --partial -y --source=/var/www/html/web/sites/default/files/sync"]
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
{{ backend_cmd.import }}
```

Capture stdout, stderr, and the exit code.

**On a non-zero exit code:**

- If `scope.validation_gate` is `'soft'` (eval/gradient-scoring mode) — record the outcome in `sync-result` and **continue**. The scorer needs the result even on failure.
- Otherwise (`scope.validation_gate` is `'hard'` or absent) — record `drush_summary` and `cim_ok: false`, then **abort** the stage immediately and surface the drush output as the failure reason.

## Result: sync-result

- `drush_summary`: the complete captured stdout/stderr from the drush invocation.
- `applied_config_names`: the list of config names that drush reported as imported during this run, parsed from the drush output.
- `cim_ok`: `true` if `drush config:import --partial` exited 0; `false` otherwise.
