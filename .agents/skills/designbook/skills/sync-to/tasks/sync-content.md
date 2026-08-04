---
title: "Import staged page content into Drupal"
trigger:
  steps: [sync-to:sync-content]
params:
  type: object
  required: [backend_cmd]
  properties:
    backend_cmd:
      type: object
      description: >
        Backend command strings from designbook.config.yml. Provides content_import_cmd
        (imports the staged content payloads into the live backend). The engine runs it
        opaquely — no drush/Drupal/path knowledge lives in this task.
      properties:
        content_import_cmd:
          type: string
          description: >
            Complete command that imports the content staging directory into the live
            backend. Run as-is; append no arguments.
          examples: ["ddev drush designbook:content-import"]
    content_units:
      type: array
      default: []
      description: >
        The content units resolve-filter produced. Empty on a config/data-model run — then this
        stage is a no-op and records an empty, successful ContentSyncResult.
      items:
        $ref: ../schemas.yml#/ContentUnit
result:
  type: object
  required: [content-sync-result]
  properties:
    content-sync-result:
      $ref: ../schemas.yml#/ContentSyncResult
---

# Sync Content

When there are no content units, do nothing and record an empty, successful `content-sync-result` (`content_ok: true`, empty summary).

Otherwise apply the staged content payloads to the live Drupal site by running:

```
{{ backend_cmd.content_import_cmd }}
```

Capture stdout, stderr, and the exit code. Content runs after config (this stage follows `sync`), so the bundles, fields, and displays the content depends on already exist.

**On a non-zero exit code:**

- If `scope.validation_gate` is `'soft'` (eval/gradient-scoring mode) — record the outcome in `content-sync-result` and **continue**.
- Otherwise (`scope.validation_gate` is `'hard'` or absent) — record `import_summary` and `content_ok: false`, then **abort** the stage immediately and surface the output as the failure reason.

## Result: content-sync-result

- `import_summary`: the complete captured stdout/stderr from the content-import invocation (empty on the no-op path).
- `content_refs`: the content_ref uuids reported as imported in this run.
- `content_ok`: `true` if the import exited 0 or there was nothing to import; `false` otherwise.
