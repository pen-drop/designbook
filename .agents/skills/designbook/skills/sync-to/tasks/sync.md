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
      resolve: backend_cmd
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

On a non-zero exit code, retain stdout/stderr as failure evidence. Correct the cause and retry this task. If it cannot be corrected within the saved definition, block the task with the attempted correction and the command output. A failed import does not complete this task.

## Result: sync-result

- `drush_summary`: the complete captured stdout/stderr from the drush invocation.
- `applied_config_names`: the list of config names that drush reported as imported during this run, parsed from the drush output.
- `cim_ok`: `true` if `drush config:import --partial` exited 0; `false` otherwise.
