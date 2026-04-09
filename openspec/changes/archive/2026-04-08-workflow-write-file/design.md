## Context

The workflow system currently has three layers for file output:

1. **Task frontmatter** declares `files: string[]` — flat path templates
2. **AI agent** writes files directly to target paths (or WORKTREE paths) using the Write tool
3. **ValidationRegistry** matches files against glob patterns (`minimatch`) to find validators

This creates four problems: (a) Storybook sees empty files mid-write, (b) file creation order is wrong, (c) Storybook chokes on rapid partial state, (d) no rollback possible. The glob-based validator matching is also fragile — `**/data.yml` could match unrelated files.

## Goals / Non-Goals

**Goals:**

- Single `workflow write-file` CLI command that handles write + validate in one step
- Engine abstracts write destination (direct → stash, git-worktree → worktree path directly)
- Task frontmatter is the single source of truth for file paths, keys, and validators
- Task body only references `--key`, never raw paths
- Remove glob-based ValidationRegistry — validators are explicit per file
- Integration tests for the full pipeline

**Non-Goals:**

- Rollback UI in Storybook panel (future work)
- Streaming/partial writes
- Backwards compatibility with old `files: string[]` format

## Decisions

### 1. Structured file declaration format

```yaml
# Task frontmatter — new format
files:
  - file: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    key: design-tokens
    validators: [tokens]
```

Each entry has:
- `file` — path template (supports `$ENV` and `{{ param }}` substitution, same as today)
- `key` — stable identifier used by `write-file --key`. Must be unique within a task.
- `validators` — array of validator keys (not glob patterns)

**Why not keep string[] and add a separate mapping?** The declaration belongs with the file. A separate mapping would split the contract across two places. One object per file is the natural unit.

**Validator key registry** (replaces glob patterns):

| Key | Validator Function | Replaces Glob |
|-----|-------------------|---------------|
| `component` | `validateComponent` | `**/*.component.yml` |
| `data-model` | `validateDataModel` | `**/data-model.yml` |
| `tokens` | `validateTokens` | `**/design-tokens.yml` |
| `data` | `validateData` | `**/data.yml` |
| `entity-mapping` | `validateEntityMapping` | `**/*.jsonata` |
| `scene` | `validateSceneBuild` | `**/*.scenes.yml` |

Files without validators (e.g., vision.md, guidelines.yml) use `validators: []` — no validation, auto-pass.

### 2. `write-file` CLI command via stdin

```bash
designbook workflow write-file <workflow-name> <task-id> --key <key> < content
```

Positional args for workflow and task (consistent with `workflow update <name> <task-id>`). Key via flag.

**Flow:**
1. Read stdin to buffer
2. Look up task by ID in tasks.yml
3. Find file entry by `key` in task's files array
4. `{ path } = engine.writeFile(task, key, content)` — engine writes and returns path
5. Validate centrally: look up validators by key, run against returned `path`
6. Update task in tasks.yml: store `validation_result`
7. Output JSON result to stdout: `{ valid, errors, file_path }`

**Why stdin?** Stdin is the Unix way. The AI can pipe content directly. No temp file management needed. Heredoc in Bash tool works for typical file sizes (YAML configs, component definitions).

**Validation is central, not in the engine.** The engine only handles writing. `writeFile` returns `{ path }` — the CLI validates against that path. No separate getter needed, no engine state to track.

### 3. Engine write strategies

The engine interface gains `writeFile(task, key, content): { path }` and `flush(tasks)`:

**Direct engine:**
- `writeFile()` → writes to stash `workflows/changes/<workflow>/stash/<task-id>/<key>`, returns `{ path: stashPath }`
- `flush()` → mv stash → target for all files, utime batch on ALL moved files, rm stash dir

**Git-worktree engine:**
- `writeFile()` → writes directly to WORKTREE target path, returns `{ path: worktreePath }`
- `flush()` → no-op (files already at correct WORKTREE location, existing commit/merge handles the rest)

**Why stash only for direct?** Git-worktree already provides filesystem isolation — the WORKTREE IS the stash. Adding a second stash layer would be redundant. Direct engine has no isolation, so it needs the stash to prevent Storybook from seeing partial writes.

**Why utime after ALL moves (direct engine)?** Storybook's chokidar watcher debounces filesystem events (~100ms). By doing all `mv` operations first, then touching all files at once, we ensure Storybook sees a single consistent state on its next poll.

### 4. Task state and validation responsibility

After `write-file`, the task's file entry in tasks.yml gains:

```yaml
files:
  - path: /abs/path/to/design-tokens.yml     # resolved target path
    key: design-tokens
    validators: [tokens]
    validation_result:
      valid: true
      last_validated: "2026-03-28T..."
```

File state is derived from `validation_result` alone — no separate flags:
- **absent** → not yet written
- **`valid: true`** → written + validated + OK
- **`valid: false`** → written + validated + errors

Files with `validators: []` get `{ valid: true, skipped: true }` on write — same state flow.

If the AI re-writes (calls `write-file` again with same key), content is overwritten and `validation_result` is replaced. The engine manages write location internally — the task state does not need to know whether the file is in a stash or a worktree.

**Stash path is not stored** — it's deterministic from `workflow-name + task-id + key`. The engine computes it identically at `writeFile` and `flush` time.

**Responsibility split:**

| Layer | Responsibility |
|-------|---------------|
| `write-file` CLI | Write + validate (active) |
| Skill/AI | Fix errors on `valid: false`, re-call `write-file` until green |
| `workflow done` | Gate-check only: assert all files have `validation_result.valid === true`. No validation logic — just reject if anything is not green |
| Engine | Where to write + flush |

`workflow done` never validates. It is a pure assertion:
1. Every file has `validation_result`? If not → error: "file `<key>` not yet written"
2. Every `validation_result.valid === true`? If not → error: "file `<key>` has errors: ..."
3. All green → task status = done

### 5. Remove ValidationRegistry glob matching

The `ValidationRegistry` class with `minimatch` is deleted. Replace with a simple lookup map:

```typescript
const validators: Record<string, ValidatorFn> = {
  'component': validateComponent,
  'data-model': validateDataModel,
  'tokens': validateTokens,
  'data': validateData,
  'entity-mapping': validateEntityMapping,
  'scene': validateSceneBuild,
};
```

Config-based extension (`validate.patterns` in designbook.config.yml) continues to work but registers by key instead of glob pattern.

### 6. Task file migration strategy

All ~28 task files get migrated. Pattern:

**Before:**
```yaml
---
files:
  - $DESIGNBOOK_DATA/design-system/design-tokens.yml
---
Create design tokens...
Write to `$DESIGNBOOK_DATA/design-system/design-tokens.yml`.
```

**After:**
```yaml
---
files:
  - file: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    key: design-tokens
    validators: [tokens]
---
Create design tokens...
Write the result with `designbook workflow write-file $WORKFLOW_NAME $TASK_ID --key design-tokens`.
```

Tasks with `files: []` (intake, visual-diff, preview) remain unchanged — empty array is valid.

## Risks / Trade-offs

- **Stdin size limit**: Very large files via heredoc may hit Bash tool limits. Mitigation: typical designbook files (YAML, Twig templates) are small (<50KB). If needed, add `--from` flag as escape hatch later.
- **Storybook still sees mv events**: `mv` triggers chokidar before `utime`. Mitigation: the debounce window (~100ms) usually coalesces rapid mv operations. If still problematic, can add chokidar pause/resume via the vite plugin's server reference.
- **Stash directory cleanup on crash**: If workflow crashes mid-stage, stash files remain. Mitigation: stash is under `workflows/changes/` which is cleaned on workflow archive. Orphaned stashes are harmless.
