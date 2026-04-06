## Why

The design-shell workflow's test pipeline has three structural gaps discovered during a --research audit:
1. The `reference` array resolved during intake never reaches the create-scene task — the data flow is broken, so scenes are always written without references, making visual comparison impossible.
2. The `inspect` step (with `inspect-storybook` and `inspect-stitch` tasks) was defined in the unified-extension-model but never added to any workflow's stage definitions.
3. The `devtools-context.md` rule references the deprecated Chrome DevTools MCP (`mcp__devtools__*`) — the new architecture uses `playwright-cli` sessions via the inspect tasks.

## What Changes

- Fix the reference data flow: intake's `resolve-design-reference` partial must produce a `reference` param that flows through to `create-scene` tasks via workflow params.
- Add `inspect` step to the test stage in design workflows (`design-shell`, `design-screen`, `design-verify`).
- Delete `devtools-context.md` — its functionality is superseded by `inspect-storybook.md` and `inspect-stitch.md`.
- Update `create-scene--design-shell.md` and `create-scene--design-screen.md` to declare `reference` as a param and include it in scene output.

## Capabilities

### New Capabilities
- `reference-data-flow`: Ensures the reference array resolved during intake is passed through workflow params to scene creation and downstream test steps.

### Modified Capabilities
- `browser-inspect`: Add the `inspect` step to workflow stage definitions so inspect tasks are actually loaded and executed.

## Impact

- Skill files: `designbook/design/tasks/`, `designbook/design/rules/`, `designbook/design/workflows/`
- Workflow definitions: `design-shell.md`, `design-screen.md`, `design-verify.md`
- No TypeScript/CLI changes required — this is purely skill-layer fixes.
