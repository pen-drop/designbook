# CLI: storybook

Manages the Storybook daemon lifecycle. State is persisted in `$DESIGNBOOK_DATA/storybook.json` (PID/port) and `$DESIGNBOOK_DATA/storybook.log` (output).

## `storybook start`

Start Storybook dev server as a detached daemon, wait until ready.

```bash
 storybook start [--port <port>] [--force]
```

| Option | Description |
|---|---|
| `--port <port>` | Port to start on (auto-detected when omitted) |
| `--force` | Stop any running Storybook before starting |

**Response:**
```json
{ "ready": true, "pid": 12345, "port": 6006, "log": "/abs/path/storybook.log", "startup_errors": [] }
```

Exit 0 if ready, exit 1 on timeout (120s) or error. Errors if already running (use `--force` or `restart` instead).

## `storybook stop`

Stop a running Storybook daemon.

```bash
 storybook stop
```

No options. Reads PID from `storybook.json`. SIGTERM → 5s wait → SIGKILL if needed. Removes `storybook.json`.

## `storybook status`

Check if a Storybook daemon is running.

```bash
 storybook status
```

**Response (running):**
```json
{ "running": true, "pid": 12345, "port": 6006, "url": "http://localhost:6006", "log": "/abs/path/storybook.log", "started_at": "2026-04-08T10:00:00" }
```

**Response (not running):**
```json
{ "running": false }
```

Cleans up stale PID file automatically. May return `"stale": true` if PID file existed but process was dead.

## `storybook logs`

Print Storybook daemon log output.

```bash
 storybook logs [-f|--follow]
```

| Option | Description |
|---|---|
| `-f, --follow` | Tail log with polling (1s intervals) |

Without `-f`: prints log content to stdout and exits.

## `storybook restart`

Restart the Storybook daemon (stop + start).

```bash
 storybook restart [--port <port>]
```

| Option | Description |
|---|---|
| `--port <port>` | Port to start on (auto-detected when omitted) |

**Response:** Same as `storybook start`.
