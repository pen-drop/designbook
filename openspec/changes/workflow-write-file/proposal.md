## Why

The current workflow file-writing pipeline is fragile: the AI writes files directly to their target paths, triggering Storybook refreshes on empty/partial state, files appear in wrong order causing broken references, and there's no way for users to rollback. Additionally, validators are matched via glob patterns which is implicit and error-prone (e.g., `**/data.yml` could match unrelated files). A unified `write-file` CLI command with stash-based staging, explicit validator keys, and atomic flush solves all four problems.

## What Changes

- Task frontmatter `files:` format changes from `string[]` to structured objects with `file`, `key`, and `validators` fields
- New `workflow write-file` CLI command that accepts content via stdin, writes to a per-workflow stash directory, and validates immediately using declared validators
- Task state is updated on `write-file` so the task can locate its stashed tmp file
- Engine is responsible for flushing stashed files to their target paths (atomic mv + utime) at stage boundaries
- Remove glob-pattern-based validator matching (`ValidationRegistry` with `minimatch`) — validators are now explicitly declared per file in task frontmatter
- All task `.md` files migrated: file paths only in frontmatter `files:`, task body uses `write-file --key <key>` exclusively — no raw paths in task body
- Integration tests for the full write → stash → validate → flush pipeline

## Capabilities

### New Capabilities

- `workflow-write-file`: CLI command that accepts file content via stdin, stashes it in a workflow-scoped temp directory, validates using declared validators, and updates task state with the stash location. Covers the write-file command, stash directory structure, stdin content handling, and immediate validation feedback.
- `task-file-declaration`: Structured file declaration format in task frontmatter — each file has a `key` (used by write-file instead of paths), `file` (target path template), and `validators` (explicit validator keys). Replaces flat string array.

### Modified Capabilities

- `workflow-execution`: Engine flush — engines gain responsibility for flushing stashed files to target paths at stage transitions (atomic mv + utime for consistent Storybook refresh)
- `workflow-format`: Task file format changes from `files: string[]` to structured `files: object[]`

## Impact

- **Task files**: All task `.md` files need full migration — frontmatter `files:` to new structured format AND task body rewritten to use `write-file --key` instead of raw file paths
- **CLI**: New `workflow write-file` subcommand in `src/cli.ts`
- **workflow-resolve.ts**: `TaskFileFrontmatter.files` parser changes from `string[]` to structured objects
- **workflow-types.ts**: `TaskFile` interface gains `key`, `validators`, `stash_path` fields
- **workflow.ts**: `write-file` handler — stash write, validate, update task state
- **validation-registry.ts**: Glob-based `ValidationRegistry` class removed, replaced by direct validator lookup via key
- **engines/**: `direct.ts` and `git-worktree.ts` gain flush logic (mv stash → target, utime)
- **Skill instruction files**: Task bodies reference `write-file --key X` instead of full paths
- **Tests**: New integration tests; existing validator/workflow tests updated
