---
title: "Sync to backend"
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
        Backend command strings from designbook.config.yml. Provides import (applies the
        generated files in the sync target directory to the live backend).
      required: [import]
      properties:
        import:
          type: string
          description: >
            Complete command that applies the generated files to the live backend. The engine
            runs this string opaquely — no backend knowledge lives in this task.
result:
  type: object
  required: [sync-result]
  properties:
    sync-result:
      $ref: ../schemas.yml#/SyncResult
---

# Sync

Apply the generated units to the live backend by running:

```
{{ backend_cmd.import }}
```

Capture stdout, stderr, and the exit code.

On a non-zero exit code, retain stdout/stderr as failure evidence. Correct the cause and retry this task. If it cannot be corrected within the saved definition, block the task with the attempted correction and the command output. A failed import does not complete this task.

## Result: sync-result

- `summary`: the complete captured stdout/stderr of the import command.
- `applied`: the unit names the import reported as applied, parsed from its output.
- `ok`: `true` when the import command exited 0.
