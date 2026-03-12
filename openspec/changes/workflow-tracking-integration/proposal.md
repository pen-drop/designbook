## Why

The `designbook-workflow` skill exists as infrastructure for tracking workflow progress in Storybook's panel (tasks.yml, notifications on completion), but no `debo-*` workflow actually uses it. Users get no feedback when a workflow finishes. Every workflow — even single-task ones like `/debo-vision` — should track progress so the Storybook panel shows status and fires a notification on completion.

## What Changes

- Add two CLI commands (`designbook workflow create` and `designbook workflow update`) that handle all tracking logic deterministically — unique name generation, YAML writes, timestamps, auto-archiving
- Add a `## Workflow Tracking` section to all user-facing `debo-*` workflow files that calls these CLI commands
- Connect `--spec` flag to workflow tracking: spec mode creates tasks.yml and shows the plan without executing

## Capabilities

### New Capabilities
- `workflow-cli`: Two CLI commands (`workflow create`, `workflow update`) for deterministic workflow tracking — unique name generation, task status management, auto-archiving
- `workflow-tracking-convention`: Convention for how every debo-* workflow integrates tracking via the CLI commands

### Modified Capabilities

## Impact

- CLI code in `packages/storybook-addon-designbook/src/cli.ts` — new `workflow` subcommand
- All 12 user-facing `debo-*` workflow files in `.agent/workflows/` — new tracking section
- `designbook-workflow` skill in `.agent/skills/` — updated to reference CLI commands instead of prompt-driven logic
