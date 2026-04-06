## Why

The direct engine's stash mechanism writes files to a separate `workflows/changes/<name>/stash/` directory. When stashed files contain relative paths (e.g., JSONata `@config` with `"input": "../../design-tokens.yml"`), those paths are computed for the target location but resolve incorrectly from the stash directory. This breaks validators that execute stashed files (e.g., `jsonata-w transform --dry-run`). The css-generate workflow is the primary affected workflow.

## What Changes

- **BREAKING** Replace separate stash directory with target-path stashing: files are written directly to their target directory with a `.{workflowId}.debo` suffix (e.g., `generate-color.jsonata.abc123.debo`)
- Flush becomes an atomic rename that strips the `.{workflowId}.debo` suffix
- Abandon/cleanup globs for `**/*.{workflowId}.debo` to remove orphaned stash files
- Remove `workflows/changes/<name>/stash/` directory creation and the `stashDir`/`stashPath` helpers
- **BREAKING** css-generate workflow: move `generate-css` step into a separate stage so it runs after flush of `generate-jsonata` output

## Capabilities

### New Capabilities

- `stash-at-target`: Stash strategy that writes files to target directory with workflow-ID suffix, enabling correct relative path resolution during validation. Covers the suffix convention, flush (rename), and cleanup (glob-delete on abandon).

### Modified Capabilities

- `workflow-execution`: Engine flush changes from moving files across directories to renaming files in-place (strip suffix). Engine cleanup/abandon gains glob-based orphan removal.
- `css-generate-stages`: `generate-css` step moves to a dedicated `transform` stage so it runs after the `execute` stage flush.

## Impact

- `packages/storybook-addon-designbook/src/engines/direct.ts` — replace `stashDir`/`stashPath` with target-path suffix logic; update `writeFile`, `flush`, `cleanup`/abandon
- `packages/storybook-addon-designbook/src/engines/types.ts` — engine interface may gain `abandon` method or cleanup signature change
- `.agents/skills/designbook/css-generate/workflows/css-generate.md` — split stages: `execute` (intake, generate-jsonata) and `transform` (generate-css)
- `packages/storybook-addon-designbook/src/validators/__tests__/workflow-write-file.test.ts` — update stash path expectations
