## Why

The git worktree is always created unconditionally in the CLI when a git repo is detected — there is no way for individual workflows to opt out or choose a different isolation strategy. Workflows like `vision` or `tokens` that write small, low-risk files don't need branch isolation and are slowed down by it.

## What Changes

- Add `engine` field to `WorkflowFile` with values `'git-worktree' | 'direct'`
- Add `engine:` key to workflow.md frontmatter (per-workflow default)
- Add `--engine` flag to `workflow plan` CLI (runtime override, takes precedence over frontmatter)
- `debo <workflow> --engine <name>` passes the flag through to `workflow plan`
- Remove dead `copy` path: `commitWorktree()` and deprecated `mergeWorktree()` are deleted
- `workflowDone`, `workflowMerge`, `workflowAbandon` dispatch on `data.engine` instead of checking `data.worktree_branch` presence
- Default (`auto`): `git-worktree` if git repo detected, `direct` otherwise — preserves existing behavior when `engine:` is unset

## Capabilities

### New Capabilities

- `workflow-engine`: Per-workflow write isolation strategy — declared in workflow.md frontmatter, overridable at runtime via `--engine` flag

### Modified Capabilities

- `workflow-execution`: `workflow plan` gains `--engine` flag; engine stored in tasks.yml; lifecycle commands dispatch on engine

## Impact

- `packages/storybook-addon-designbook/src/workflow.ts` — remove `commitWorktree`, `mergeWorktree`; add engine dispatch in `workflowDone`, `workflowMerge`, `workflowAbandon`
- `packages/storybook-addon-designbook/src/cli.ts` — `workflow plan` command gains `--engine` flag; removes hardcoded `isGitRepo` → worktree logic
- `packages/storybook-addon-designbook/src/workflow-resolve.ts` — reads `engine:` from workflow.md frontmatter
- `.agents/skills/designbook/resources/workflow-execution.md` — documents `--engine` passthrough in `workflow plan` call
- Individual workflow.md files (vision, tokens, css-generate, etc.) — add `engine: direct` where git isolation is not needed
