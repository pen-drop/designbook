---
title: Install Designbook
description: Install designbook into an existing project — detect the backend, dispatch to the integration skill's install steps, verify the result.
track: false
---

# Designbook Install

Untracked utility workflow (`track: false`, see `resources/workflow-execution.md` §7) —
no run state, no `workflow create`. Install produces no tracked artifacts, and engine
state must not be written into the target project before designbook is set up there.
Phases 1–3 use plain file operations; the addon CLI is first used in Phase 4.

Execute the phases in order. Every abort must state the reason and what the user
should do next. Never report success while any step failed.

## Phase 1 — Preconditions

1. Locate the skills root: the directory containing this skill (`.agents/skills/`
   or `.claude/skills/`), walking up from the current working directory.
   The project root is determined in Phase 2 by marker walk-up from the CWD.
2. Walk up from the project root looking for an existing `designbook.config.yml`
   (or `.yaml`). Found → designbook is already installed: report the path and stop.
   Continue only if the user explicitly asks to reconfigure, and never overwrite
   the existing file without showing the intended changes and getting confirmation.
3. Check that `node --version` succeeds and reports major version >= 20. Missing or older → tell the user to install Node.js >= 20 and stop.

## Phase 2 — Detect backend

Determine the project root: walk up from the CWD to the first directory containing a marker from the table (checking each directory against all rows). Evaluate the table top to bottom there; first match wins.

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

1. Install JS dependencies in the resolved `designbook.home` directory: `pnpm install` when a `pnpm-lock.yaml` or `pnpm-workspace.yaml` is present in that directory or any parent up to the project root; otherwise `npm install`.
2. Start Storybook through the addon CLI:
   `npx storybook-addon-designbook storybook start --force`
   The command exits 0 once Storybook is reachable and outputs a JSON object.
   Parse its `port` field and construct the URL as `http://localhost:<port>`.
   When the JSON's `startup_errors` array is non-empty, print every entry; continue only if the check in step 3 still passes.
3. Confirm Storybook serves the story index: `curl -sf http://localhost:<port>/index.json`
   returns HTTP 200.
4. Any failure → stop, show the exact command output, and escalate to the user.
   Do not retry silently and do not mark the install successful.
5. On success print a summary: backend, theme directory, config file path,
   Storybook URL. Leave Storybook running; mention it can be stopped with `npx storybook-addon-designbook storybook stop`.
