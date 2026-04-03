## Context

The `StorybookDaemon` class manages PID/port state via a `storybook.json` file. The `stop()` method deletes this file. When `start --force` calls `stop()` first, the port info is lost before the new instance starts.

## Goals / Non-Goals

**Goals:**
- Preserve existing port across `--force` and `restart` operations
- Keep `findFreePort()` as fallback for fresh starts (no existing instance)

**Non-Goals:**
- Changing PID persistence behavior (new PID is expected after restart)
- Adding port reservation or lock mechanisms

## Decisions

### 1. Read port before stop, not after

The fix reads `this.info.port` before calling `this.stop()` (which removes the PID file). This is a two-line change in both `start()` and `restart()`.

**Alternative considered:** Make `stop()` preserve the port in a separate file — rejected as over-engineered for a simple state-ordering fix.

### 2. Make port parameter optional with fallback chain

Port resolution follows: explicit `--port` flag → existing instance port → `findFreePort()`. This matches user intent: "restart the same thing" vs "start something new".

## Risks / Trade-offs

- **Risk:** Port may be in use by another process after stop → **Mitigation:** Storybook will fail to bind and the error is reported; user can retry with `--port`.
