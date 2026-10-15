---
name: sync-to-intake
description: Domain decisions required before planning sync-to artifacts.
trigger:
  steps: [sync-to:intake]
---

# sync-to intake

Read the model and effective backend configuration. Resolve the filter (or the named Scene) into `SyncUnit`s: expand each matching slice into the units the active backend's sync-unit rule defines, in dependency-before-user order. Then apply the existence filter: run `{{ backend_cmd.exists_cmd }} {{ sync_target_dir }}/<unit.path>` per unit and drop every unit whose command exits 0, keeping the relative order — a re-run against an already-synced target yields an empty or partial unit list. Select applicable routing blueprints now. Freeze unit names and output paths before planning transforms.

Follow the [shared builder](../../../resources/workflow-building.md) for sealing and execution modes.
