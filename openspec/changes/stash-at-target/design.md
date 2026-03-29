## Context

The direct engine stashes files in `workflows/changes/<name>/stash/<taskId>/<key>` — a separate directory tree. This breaks when stashed files contain relative paths computed for their target location (e.g., JSONata `@config` blocks referencing `../../design-system/design-tokens.yml`). Validators that execute these files fail because the relative paths resolve incorrectly from the stash directory.

The css-generate workflow is the primary affected workflow: `generate-jsonata` writes `.jsonata` files with relative `@config` paths, and the validator `jsonata-w transform --dry-run` fails on the stash path.

## Goals / Non-Goals

**Goals:**
- Stashed files resolve relative paths correctly (identical to target location)
- Validators run successfully on stashed files
- Flush remains atomic (no partial state visible to Storybook)
- Abandon/crash cleanup is straightforward
- Multiple concurrent workflows don't conflict

**Non-Goals:**
- Changing the git-worktree engine (it doesn't use the stash mechanism)
- Changing how validators are invoked (they already receive `{{ file }}`)
- Adding new validator features

## Decisions

### Decision 1: Stash at target path with workflow-ID suffix

**Choice**: Write stashed files to `<target-path>.<workflow_id>.debo` instead of a separate stash directory.

**Rationale**: The file sits in the same directory as its final target. Relative paths resolve identically. No symlinks, no directory mirroring, no seed files.

**Alternatives considered**:
- *Separate stash with seed files*: Would require copying referenced files into the stash tree and maintaining relative directory structure — complex and fragile.
- *Symlink from target to stash*: Cross-filesystem issues, `rename()` breaks symlinks, flush becomes complex.
- *Passthrough engine (no stash)*: Loses atomic flush and Storybook stability benefits.

### Decision 2: Suffix format `.{workflow_id}.debo`

**Choice**: Use the workflow's short hex ID suffix (the last segment of the workflow name, e.g., `a1b2` from `css-generate-2026-03-29-a1b2`) combined with the `.debo` extension. Persisted as `workflow_id` in `tasks.yml`.

**Rationale**:
- Workflow ID makes files uniquely identifiable per workflow — no collision between concurrent workflows.
- `.debo` is an unused extension — Storybook, build tools, and glob patterns (e.g., `*.jsonata`) won't accidentally pick up stashed files.
- On abandon, a single glob `**/*.{workflow_id}.debo` cleans up all orphaned stash files.

### Decision 3: Flush = rename in-place

**Choice**: `flush()` renames `target.ext.{workflow_id}.debo` → `target.ext` using `renameSync`. Same directory, always same filesystem — guaranteed atomic.

**Rationale**: Simpler than cross-directory `renameSync` (which can fail across mount points). The `utimesSync` batch-touch still applies after rename for consistent Storybook refresh.

### Decision 4: Move generate-css to a separate stage

**Choice**: Split css-generate workflow stages into `execute` (intake, generate-jsonata) and `transform` (generate-css).

**Rationale**: `generate-css` reads `.jsonata` files at their final target paths. It must run after the `execute` stage flush moves files from `.debo` suffix to final name. Putting it in a separate stage ensures the flush boundary exists between generation and transformation.

## Risks / Trade-offs

- **`.debo` files visible in target directory during execution** → Mitigated: `.debo` extension is not matched by any existing globs (`*.jsonata`, `*.css`). Storybook watchers ignore unknown extensions.
- **Crash leaves orphaned `.debo` files** → Mitigated: abandon/cleanup globs by workflow ID. Could also add startup cleanup that removes any `*.debo` files.
- **Validator `{{ file }}` now points to `.debo` path** → This is intentional and correct. The `.debo` file is at the target location, so relative paths work. Validators that check file extension may need adjustment, but current validators (`jsonata-w transform --dry-run`) don't care about the extension.
