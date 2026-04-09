## Why

Subagents write files in wrong order and create empty placeholder files first, causing Storybook's file watcher to crash and CSS to not update correctly. Every workflow run is a gamble on whether Storybook survives the write sequence.

## What Changes

- **NEW** `DESIGNBOOK_WORKTREE` environment variable — points to an isolated `/tmp/designbook-[workflow-id]/` directory during workflow execution; defaults to `DESIGNBOOK_ROOT` when no workflow is active
- **NEW** `workflow plan` creates the WORKTREE directory and transforms all `files:` paths to point there
- **NEW** Each file entry in `tasks.yml` gets an `id` field — AI references files by ID, CLI owns the actual path
- **MODIFIED** `workflow plan` path resolution — after expanding env vars and params, strips `DESIGNBOOK_ROOT` prefix and prepends `DESIGNBOOK_WORKTREE`
- **MODIFIED** `workflow done` (final task) — after last task completes, copies all WORKTREE files to `DESIGNBOOK_ROOT`, touches them all, then removes WORKTREE
- **MODIFIED** `touch-after-done` behavior — touch now happens in bulk after the full workflow copy, not per-task
- Task files (`.agents/skills/*/tasks/*.md`) — instructions reference file IDs, not paths

## Capabilities

### New Capabilities

- `virtual-write-workspace`: Isolated per-workflow write directory under `/tmp`. Covers WORKTREE lifecycle (create, transform paths, bulk copy+touch, cleanup), the `id` field on `files:` entries in tasks.yml, and the `DESIGNBOOK_WORKTREE` env var contract.

### Modified Capabilities

- `workflow-plan-resolution`: Path expansion gains a WORKTREE transformation step — after resolving env vars and params, all `files:` paths are remapped to `DESIGNBOOK_WORKTREE`.
- `touch-after-done`: Touch moves from per-task (after each `workflow done`) to post-workflow bulk (after final copy from WORKTREE to DESIGNBOOK_ROOT).

## Impact

- `designbook-workflow` CLI: `workflow plan` and `workflow done` commands
- `tasks.yml` format: `files:` entries gain `id` field (`- id: x, path: /tmp/...`)
- All skill task files: instructions updated to reference file IDs
- `openspec/specs/workflow-plan-resolution/spec.md`: new path transformation requirement
- `openspec/specs/touch-after-done/spec.md`: touch timing change
- No impact on `reads:` — always resolved against real `DESIGNBOOK_ROOT`
- No impact on Storybook config, workflow stages, DAG orchestration
