## Why

Task file resolution uses a different mechanism than rules and blueprints. Rules and blueprints use a broad glob scan (`skills/**/rules/*.md`) filtered by `when.steps`, but tasks use a narrow filename match (`skills/**/tasks/${step}.md`). This caused the `inspect` step to silently fail — `inspect-storybook.md` and `inspect-stitch.md` were never found because the filename didn't match the step name exactly.

A pragmatic fix (broad scan + `when.steps` filter as fallback) was applied in `designbook-design-test-pipeline-fixes`, but the real fix is to unify task resolution with the existing rule/blueprint model.

## What Changes

- **Task resolution becomes broad-scan + `when` matching** — same as rules and blueprints. The resolver scans `skills/**/tasks/*.md` and filters by `when.steps`.
- **Every task file gets a `when.steps` declaration** — 34 tasks currently rely on filename convention. Each gets `when: steps: [<step>]` derived from its filename.
- **Filename convention becomes optional** — still used for human readability but no longer required for resolution.
- **Workflow-qualified tasks** (e.g. `intake--design-shell.md`) keep their naming but also get `when.steps: [intake]`. The workflow qualifier moves from filename convention to a `when` condition or `name` field.
- **Tasks without `when.steps`** (e.g. `prepare-fonts.md` with only `when: extensions: google-fonts`) must add `steps` to avoid matching every step.

## Capabilities

### New Capabilities
- `uniform-task-resolution`: Task files are resolved using the same broad-scan + `when` mechanism as rules and blueprints.

### Modified Capabilities
- `multi-task-steps`: Currently relies on the pragmatic fallback. After this change, multi-task steps work natively through the unified resolution model.

## Impact

- **CLI code**: `resolveTaskFiles()` and `resolveTaskFilesRich()` in `workflow-resolve.ts` — replace filename-based glob with broad scan.
- **Skill files**: All 39 task files under `.agents/skills/` need `when.steps` added to frontmatter.
- **Tests**: Existing 93 tests in `workflow-resolve.test.ts` need updates; new tests for broad-scan resolution.
- **Backwards compatibility**: Filename-based fallback retained during transition, removed once all tasks are migrated.
