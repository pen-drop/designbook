---
name: install
description: Install designbook into an existing project — check preconditions, detect the backend, dispatch to the integration skill's install instructions, verify the result.
---

# Designbook Install

Pure skill flow. The workflow engine is NOT available during install — the Storybook
addon and `designbook.config.yml` do not exist yet. Do not run `workflow create`;
Rules 0–7 from `resources/workflow-execution.md` do not apply to this flow.

Execute the phases in order. Every abort must state the reason and what the user
should do next. Never report success while any step failed.

## Phase 1 — Preconditions

1. Locate the skills root: the directory containing this skill (`.agents/skills/`
   or `.claude/skills/`), walking up from the current working directory.
2. Walk up from the project root looking for an existing `designbook.config.yml`
   (or `.yaml`). Found → designbook is already installed: report the path and stop.
   Continue only if the user explicitly asks to reconfigure, and never overwrite
   the existing file without showing the intended changes and getting confirmation.
3. Check that `node --version` succeeds. Missing → tell the user to install
   Node.js (>= 20) and stop.

## Phase 2 — Detect backend

Evaluate the table top to bottom against the project root. First match wins.

| Backend | Marker | Integration skill |
|---|---|---|
| `drupal` | `composer.json` exists and its `require` or `require-dev` contains a package whose name starts with `drupal/core` | `designbook-drupal` |

- No row matches → print the list of supported backends from this table and stop.
- The matched integration skill directory is missing under the skills root → tell
  the user to install it via the Claude marketplace and stop.

Adding a backend = one new row here + a `designbook-<backend>` integration skill
shipping an `install/` directory. Nothing else in this file changes.

## Phase 3 — Dispatch

Read `<skills-root>/designbook-<backend>/install/install.md` and follow it
completely. It handles backend-specific detection details, target/theme discovery,
Storybook setup, and writing `designbook.config.yml`. When it finishes, continue
with Phase 4.

## Phase 4 — Verify

Locate the `designbook.config.yml` written in Phase 3.

Read `designbook.home` from that config file first. It is relative to the config
file's directory; resolve it to an absolute path and run every command in this
phase from there.

1. Install JS dependencies in the resolved `designbook.home` directory: `pnpm install` when a
   `pnpm-lock.yaml` or `pnpm-workspace.yaml` is present, otherwise `npm install`.
2. Start Storybook through the addon CLI:
   `npx storybook-addon-designbook storybook start --force`
   The command exits 0 once Storybook is reachable and outputs a JSON object.
   Parse its `port` field and construct the URL as `http://localhost:<port>`.
3. Confirm Storybook serves the story index: `curl -sf http://localhost:<port>/index.json`
   returns HTTP 200.
4. Any failure → stop, show the exact command output, and escalate to the user.
   Do not retry silently and do not mark the install successful.
5. On success print a summary: backend, theme directory, config file path,
   Storybook URL.
