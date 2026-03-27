## NEW Requirements

### Requirement: prepare-environment — start Storybook, check logs, screenshot

After all non-test tasks complete and outputs are committed to the worktree branch, the `prepare-environment` lifecycle step runs internally (not a CLI command). It starts Storybook via the `storybook start` CLI command, waits for the ready signal while monitoring logs for errors, takes screenshots of the workflow's scenes, and stores port, PID, and screenshot paths in `tasks.yml`. Test tasks run after this step completes.

#### Scenario: prepare-environment calls storybook start
- **WHEN** prepare-environment runs
- **THEN** it invokes `designbook storybook start --port <preview_port>` as a subprocess
- **THEN** it reads the JSON ready output from the command
- **THEN** `preview_port` and `preview_pid` are stored in `tasks.yml`
- **THEN** `DESIGNBOOK_PREVIEW_URL` is set to `http://localhost:<preview_port>` for test tasks

#### Scenario: screenshot taken for each scene in workflow
- **WHEN** Storybook is ready
- **THEN** `designbook screenshot` is called for each scene declared in the workflow's tasks
- **THEN** screenshots are saved to `$DESIGNBOOK_DIST/workflows/changes/<name>/screenshots/<scene>.png`
- **THEN** paths stored in `tasks.yml` under `pre_test_screenshots`

#### Scenario: startup errors surfaced in review status
- **WHEN** `startup_errors` is non-empty in the `storybook start` output
- **THEN** the review status includes: "Storybook started with build errors — review before merging"

#### Scenario: preview port auto-detected when not specified
- **WHEN** `storybook start` is called without `--port`
- **THEN** a free port is detected automatically (OS assigns via binding to port 0)
- **THEN** the assigned port is returned in the JSON ready output and stored as `preview_port` in `tasks.yml`

#### Scenario: preview cleaned up on workflow merge
- **WHEN** `workflow merge --workflow <name>` is called
- **THEN** the process with PID `preview_pid` is killed before the git merge

---

### Requirement: storybook start CLI command

A new `designbook storybook start` command wraps `storybook_cmd` from config with controlled log streaming and ready detection. It reads the command from config, starts the process, streams all logs, and outputs a JSON ready signal.

#### Scenario: storybook start reads cmd from config and starts process
- **WHEN** `designbook storybook start` is called (with optional `--port <port>`)
- **THEN** `storybook_cmd` is read from config
- **IF** `--port` is provided: appended to the command
- **IF** `--port` is omitted: a free port is auto-detected and appended
- **THEN** the process is spawned with piped stdout/stderr

#### Scenario: all log lines forwarded to caller
- **WHEN** the Storybook process emits output
- **THEN** every stdout/stderr line is written to the CLI output so callers can observe the full log

#### Scenario: polls story-index until ready, then exits
- **WHEN** the Storybook process is running
- **THEN** the command polls `GET http://localhost:<port>/_storybook/story-index.json` every 2 seconds
- **WHEN** the response body contains a valid story index (field `entries` is defined)
- **THEN** the command outputs JSON to stdout: `{ "ready": true, "pid": <pid>, "port": <actual-port>, "startup_errors": [...] }`
- **THEN** the CLI process **exits with code 0** — the Storybook process continues running as a background daemon (detached)

#### Scenario: error lines collected from logs during startup
- **WHILE** polling `/_storybook/story-index.json`
- **WHEN** a log line matches an error pattern (`ERROR`, `ModuleNotFoundError`, `Cannot find`, `Failed to`)
- **THEN** that line is appended to `startup_errors[]`
- **THEN** errors do not block the ready check — they are reported alongside the ready signal

#### Scenario: timeout — process killed, exit 1
- **IF** `/_storybook/story-index.json` does not return a valid story index within 120s
- **THEN** the Storybook process is killed and the command outputs `{ "ready": false, "error": "timeout" }` and exits with code 1

---

### Requirement: storybook stop CLI command

`designbook storybook stop --pid <pid>` kills a running Storybook preview process started by `storybook start`.

#### Scenario: stop kills the process by PID
- **WHEN** `designbook storybook stop --pid <pid>` is called
- **THEN** the process with the given PID is sent SIGTERM (SIGKILL after 5s if still running)
- **THEN** the command exits with code 0

#### Scenario: stop called on non-existent PID
- **WHEN** the PID no longer exists
- **THEN** the command exits with code 0 silently (process already gone)
