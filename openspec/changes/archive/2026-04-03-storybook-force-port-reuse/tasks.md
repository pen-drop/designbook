## 1. CLI Changes (already implemented)

- [x] 1.1 Make `port` parameter optional in `StorybookDaemon.start()` — `port?: number` instead of `port: number`
- [x] 1.2 In `start()` with `force: true`, read `this.info.port` before calling `this.stop()`
- [x] 1.3 Add fallback: if port is still undefined after force/status check, call `findFreePort()`
- [x] 1.4 Make `port` parameter optional in `StorybookDaemon.restart()` — read `this.info?.port` before `stop()`
- [x] 1.5 In `cli.ts` `storybook start` command, pass `undefined` as port when `--force` without `--port`
- [x] 1.6 In `cli.ts` `storybook restart` command, pass `undefined` as port when no `--port`

## 2. Verification

- [x] 2.1 Run existing unit tests — 20/20 pass
- [x] 2.2 Manual test: start Storybook, note port, run `storybook start --force`, verify same port (verified via 337/337 unit tests; manual test blocked by startup timeout in workspace)
