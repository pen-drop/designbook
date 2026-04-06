## Why

The current skill architecture has three artifact types (tasks, rules, blueprints) with inconsistent extension mechanisms. Tasks are resolved 1:1 by filename, blueprints use `type+name` deduplication with priority, and rules are purely additive. There is no unified way for integration skills to override or extend behavior across artifact types. This blocks the planned browser-inspect workflow (playwright-cli based visual comparison) which requires multiple tasks per step with priority ordering and extensibility.

## What Changes

- **BREAKING**: Task frontmatter gains `name` (namespaced `<skill>:<concern>:<name>`) and optional `priority` fields. Tasks within a step are ordered by priority.
- **BREAKING**: Multiple tasks can match a single step. Without `as`, tasks are additive (all run). With `as: <name>`, a task overrides the named task (highest priority wins).
- Rule and blueprint frontmatter gain the same `as: <name>` mechanism for overrides.
- Blueprint `type+name` deduplication is reframed as implicit `name` (backward compatible).
- Namespace convention `<skill>:<concern>:<artifact>` for all artifact names, with short names resolved within the same skill.
- `workflow create` CLI resolves multiple tasks per step, sorts by priority, and applies `as` deduplication.
- New test pipeline steps (`screenshot`, `inspect`, `compare`, `polish`) replace the current 5-step flow, using the new multi-task-per-step model.
- `playwright-cli` replaces MCP DevTools for browser inspection during visual comparison.

## Capabilities

### New Capabilities
- `artifact-naming`: Unified namespaced naming convention (`<skill>:<concern>:<name>`) for tasks, rules, and blueprints. Short-name resolution within the same skill.
- `artifact-override`: The `as` mechanism allowing any artifact to override another by name, with priority-based conflict resolution. Applies uniformly to tasks, rules, and blueprints.
- `multi-task-steps`: Multiple tasks can match a single workflow step. Additive by default, with `as` for targeted override. Priority determines execution order.
- `browser-inspect`: playwright-cli based browser inspection for visual comparison workflows. Session management, computed style extraction, font verification, DOM queries. Replaces MCP DevTools dependency.

### Modified Capabilities
- `workflow-plan-resolution`: Plan resolution must discover and sort multiple tasks per step, apply `as` deduplication, and pass priority ordering to task execution.
- `workflow-execution`: Execution must handle multiple tasks per step sequentially (by priority), with shared data passing between tasks in the same step.

## Impact

- **CLI (storybook-addon-designbook)**: `workflow create` task resolution logic needs multi-task discovery, priority sorting, and `as` deduplication. New `browser` subcommand wrapping playwright-cli.
- **Skill files**: All existing task/rule/blueprint frontmatter remains valid (backward compatible). New `name`, `as`, `priority` fields are optional additions.
- **Architecture docs**: `resources/architecture.md` and `resources/task-format.md` need updates for the unified model.
- **Integration skills**: `designbook-stitch`, `designbook-drupal`, `designbook-css-tailwind` gain the ability to override core artifacts cleanly instead of relying on `when` conditions alone.
- **Dependencies**: `playwright-cli` (already installed) becomes a runtime dependency for the inspect workflow.
