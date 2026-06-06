---
title: Install Designbook
description: Install designbook into an existing project — detect the backend, find the target, write config, set up Storybook, and verify the result.
track: false
stages:
  detect:
    steps: [detect-backend]
  target:
    steps: [find-target]
  config:
    steps: [write-config]
  storybook:
    steps: [setup-storybook]
  verify:
    steps: [verify-install]
---

# Designbook Install

Untracked utility workflow (`track: false`, see `resources/workflow-execution.md` §7) —
no run state, no `workflow create`, no `engine:`. Install runs before designbook
exists in the target, so the engine lifecycle is unavailable: the AI executes the
stages directly. The addon CLI is only reachable from the verify stage onward, once
`designbook.config.yml` and dependencies are in place.

## Execution Protocol

Execute the stages in this order: `detect` → `target` → `config` → `storybook` →
`verify`. For each step in a stage:

1. Load `tasks/<step>.md` from this skill (the WHAT the step must produce).
2. Load every rule and blueprint — across all installed skills — whose
   `trigger.steps` matches the step name **and** whose `filter:` passes (see below).
   These carry the backend- and framework-specific HOW.
3. Produce the step's declared result, honouring the loaded rules (hard constraints)
   and blueprints (overridable starting points).

A stage completes when its steps' results exist; the next stage then begins.

### Filter Evaluation Source

`filter:` keys on rules/blueprints are matched against the values produced so far:

- **Until the `config` stage flushes** `designbook.config.yml`, evaluate `filter:`
  against values from earlier stages — chiefly `backend` from `detect-backend`.
- **From the `storybook` stage onward**, evaluate `filter:` against the written
  `designbook.config.yml` (backend, `frameworks.*`, `extensions`).

A filter key whose value is not yet known passes (deferring); a key whose value is
known but does not match excludes that rule/blueprint.

## Preconditions

Before the `detect` stage starts:

1. **Project root.** Walk up from the CWD to the first directory containing a
   detection marker (the `detect-backend` task and its rules define the markers).
   That directory is the project root used by the steps below and the `detect` stage.
2. **Skills root.** Locate the directory containing this skill (`.agents/skills/` or
   `.claude/skills/`) by walking up from the current working directory.
3. **Already installed.** Walk up from the project root (resolved in step 1) for an
   existing `designbook.config.yml` (or `.yaml`). Found → designbook is already
   installed: report the path and stop. Continue only if the user explicitly asks to
   reconfigure, and never overwrite the existing file without showing the intended
   changes and getting confirmation.
4. **Node version.** `node --version` must succeed and report major version ≥ 20.
   Missing or older → tell the user to install Node.js ≥ 20 and stop.

## Abort Semantics

Every abort must state the reason and the next action the user should take. Never
report success while any stage failed; on verify failure, show the exact command
output and escalate rather than retrying silently.
