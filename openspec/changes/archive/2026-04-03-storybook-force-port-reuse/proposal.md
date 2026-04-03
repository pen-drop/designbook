## Why

When `storybook start --force` or `storybook restart` is called without an explicit `--port`, the CLI picks a new random port via `findFreePort()` instead of reusing the port from the existing instance. This causes agents to lose their Storybook URL mid-workflow, requiring them to re-discover the port.

## What Changes

- **`storybook start --force` reuses existing port** — When `--force` is used without `--port`, the CLI reads the existing port from the PID file before stopping, then restarts on the same port.
- **`storybook restart` reuses existing port** — Same behavior: reads port from `this.info` before `stop()` destroys the PID file.
- **Port parameter made optional** — `start()` and `restart()` methods accept `port?: number` instead of `port: number`, with `findFreePort()` as fallback only when no port can be determined.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `addon-cli`: `storybook start --force` and `storybook restart` reuse the existing port when no `--port` flag is given.

## Impact

- **Affected files**: `packages/storybook-addon-designbook/src/storybook.ts`, `packages/storybook-addon-designbook/src/cli.ts`
- **No breaking changes** — explicit `--port` still overrides; only the default behavior changes when port is omitted
- **Already implemented and tested** — 20/20 unit tests pass
