## ADDED Requirements

### Requirement: outputs defines write-capable path prefixes

`designbook.config.yml` SHALL support an `outputs` section that declares all write-capable path prefixes for a project. Each output is exposed as a `DESIGNBOOK_OUTPUTS_<KEY>` env var by the CLI.

#### Scenario: outputs exposed as env vars
- **WHEN** `designbook.config.yml` declares `outputs: { config: ./designbook, components: ./components, css: ./css/tokens }`
- **THEN** the CLI exposes `DESIGNBOOK_OUTPUTS_CONFIG`, `DESIGNBOOK_OUTPUTS_COMPONENTS`, `DESIGNBOOK_OUTPUTS_CSS`

#### Scenario: only outputs vars are remapped to WORKTREE
- **WHEN** `workflow plan` runs with an active WORKTREE
- **THEN** only env vars derived from `outputs.*` are remapped to WORKTREE paths — all other vars remain as real paths

---

### Requirement: DESIGNBOOK_WORKTREE isolates workflow writes

The system SHALL provide a `DESIGNBOOK_WORKTREE` environment variable pointing to an isolated per-workflow write directory. The base directory is `DESIGNBOOK_WORKSPACES` (defaults to `/tmp`). Outside an active workflow, all target vars resolve to real `DESIGNBOOK_ROOT`-relative paths.

#### Scenario: WORKTREE created at workflow plan
- **WHEN** `workflow plan` is called
- **THEN** `$DESIGNBOOK_WORKSPACES/designbook-[workflow-id]/` is created and all `outputs.*` env vars are remapped to point inside it

#### Scenario: DESIGNBOOK_WORKSPACES defaults to /tmp
- **WHEN** `DESIGNBOOK_WORKSPACES` is not set
- **THEN** CLI uses `/tmp` as base, producing `/tmp/designbook-[workflow-id]/`

#### Scenario: DESIGNBOOK_WORKSPACES can be overridden
- **WHEN** `DESIGNBOOK_WORKSPACES=/var/workspace` is set
- **THEN** WORKTREE is created at `/var/workspace/designbook-[workflow-id]/`

#### Scenario: targets vars remapped, other vars unchanged
- **WHEN** a workflow is active
- **THEN** `DESIGNBOOK_OUTPUTS_CONFIG` = `WORKTREE/designbook`, `DESIGNBOOK_OUTPUTS_COMPONENTS` = `WORKTREE/components` — but `DESIGNBOOK_ROOT` still points to real filesystem

#### Scenario: reads: paths never remapped
- **WHEN** a task file declares `reads: [{path: $DESIGNBOOK_OUTPUTS_CONFIG/data-model.yml}]`
- **THEN** that path resolves against the real `DESIGNBOOK_ROOT`, not WORKTREE

#### Scenario: files: paths auto-resolve to WORKTREE
- **WHEN** a task file declares `files: [$DESIGNBOOK_OUTPUTS_CONFIG/sections/hero/hero.scenes.yml]`
- **THEN** `DESIGNBOOK_OUTPUTS_CONFIG` is already remapped → path resolves to WORKTREE automatically

#### Scenario: dynamic writes also land in WORKTREE
- **WHEN** a subagent or tool writes to `$DESIGNBOOK_OUTPUTS_CONFIG` or any other target var
- **THEN** the file lands in WORKTREE because the var is remapped — no alias or ID needed

---

### Requirement: workflow done copies WORKTREE to DESIGNBOOK_ROOT after final task

After the last task is marked `done`, the system SHALL copy all files from WORKTREE to `DESIGNBOOK_ROOT`, touch all copied files, and remove the WORKTREE.

#### Scenario: Bulk copy after final task
- **WHEN** `workflow done` detects no tasks remain pending or in-progress
- **THEN** all files under WORKTREE are copied to their corresponding paths under `DESIGNBOOK_ROOT`

#### Scenario: All copied files are touched
- **WHEN** the bulk copy completes
- **THEN** every copied file has its mtime updated to trigger Storybook HMR

#### Scenario: WORKTREE removed after copy
- **WHEN** copy and touch complete
- **THEN** the WORKTREE directory is removed

#### Scenario: WORKTREE path stored in tasks.yml
- **WHEN** `workflow plan` creates the WORKTREE
- **THEN** the path is stored in `tasks.yml` under `write_root`

#### Scenario: No per-task touch during workflow execution
- **WHEN** an individual (non-final) task is marked done
- **THEN** no files are touched — Storybook observes no intermediate state
