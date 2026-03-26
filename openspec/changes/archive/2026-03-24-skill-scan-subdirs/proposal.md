## Why

Skills currently organize rule files and task files in flat directories (`rules/*.md`, `tasks/*.md`). As skill complexity grows — particularly for Drupal-specific skills with template variants — authors need to group related rules into subdirectories (e.g., `rules/layout-builder/`, `rules/canvas/`). The `matchRuleFiles` and `resolveTaskFile` functions use non-recursive `readdirSync`, so any file placed in a subdirectory is silently ignored.

## What Changes

- `matchRuleFiles` in `workflow-resolve.ts` scans `rules/**/*.md` recursively instead of `rules/*.md` only
- `resolveTaskFile` (generic stage path) scans `tasks/**/*.md` recursively instead of `tasks/<stage>.md` only
- Named stage resolution (`skill:task` format) remains a direct path lookup — no change needed
- No changes to frontmatter parsing, `when` condition logic, or any other resolution logic

## Capabilities

### New Capabilities

- `skill-scan-subdirs`: Recursive scanning of `rules/` and `tasks/` directories in skill folders, enabling skills to organize files in subdirectory structures while remaining fully discoverable by the CLI resolver

### Modified Capabilities

- `workflow-plan-resolution`: The rule file matching requirement currently specifies `skills/*/rules/*.md` — this changes to `skills/*/rules/**/*.md` (recursive). The task file scanning for generic stages similarly changes to recurse into subdirectories.

## Impact

- `packages/storybook-addon-designbook/src/workflow-resolve.ts`: `matchRuleFiles` and `resolveTaskFile` functions
- No changes to the public API (`ResolvedTask`, `ResolvedPlan`, `ResolvedStages` interfaces remain identical)
- Existing flat `rules/` and `tasks/` structures continue to work without modification
