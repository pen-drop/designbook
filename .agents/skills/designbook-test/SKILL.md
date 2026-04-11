---
name: debo-test
argument-hint: "<suite> <case>"
description: >
  Set up a test workspace from fixtures and run a workflow case.
  Use for manual testing of designbook workflows with pre-built fixture data.
  Supports snapshot creation to save workflow results as new fixtures.
---

## Dispatch

Parse `$ARGUMENTS` as: `<suite> [<case>]`

- **suite**: Required. The fixture suite name (e.g., `drupal-petshop`, `drupal-stitch`).
- **case**: Optional. The case name (e.g., `design-screen`, `vision`).

## Workflow

### 1. List cases (no case argument)

If only `<suite>` is provided:

1. List all `.yaml` files in `fixtures/<suite>/cases/`
2. Show them as a numbered list with the `fixtures` field from each case
3. Ask the user to pick one

### 2. Setup workspace

Always create a fresh workspace — never reuse an existing one.

1. If `workspaces/<suite>` already exists, **delete it first**: `rm -rf workspaces/<suite>`
2. Run `./scripts/setup-workspace.sh <suite>` — creates the base workspace with Storybook infrastructure and `pnpm install`
3. Run: `./scripts/setup-test.sh <suite> <case> --into workspaces/<suite>` — layers fixtures and config onto the workspace
4. Report the workspace path to the user

### 3. Start Storybook

After setup, start Storybook via the addon CLI:

```bash
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"
_debo storybook start
```

Report the Storybook URL to the user (`_debo storybook status` returns the `url` field when running).

### 4. Display prompt and confirm

1. Read `fixtures/<suite>/cases/<case>.yaml`
2. Display the `prompt` field to the user
3. Ask: "Execute this prompt in the workspace? (y/n)"
4. If **yes**: `cd` into the workspace and execute the prompt (run the workflow)
5. If **no**: Tell the user the workspace is ready for manual use

Use `_debo storybook stop` to stop Storybook when the session ends or the user requests it.

### 5. Snapshot offer (after workflow completion)

After the workflow completes:

1. `cd` into the workspace directory
2. Run `git diff --name-only` and `git ls-files --others --exclude-standard` to find changed/new files
3. Exclude `.agents/`, `.claude/`, `openspec/`, `.storybook/`, `node_modules/` from the list
4. Display the list of changed files to the user
5. Ask: "Save as fixture? Enter name (default: <case>) or 'n' to skip"
6. If the user provides a name (or accepts default):
   - For each changed/new file, copy it to `fixtures/<suite>/<fixture-name>/` preserving the workspace-relative path
   - Report: "✓ Fixture saved to fixtures/<suite>/<fixture-name>/"
7. If the user declines: do nothing, workspace remains

### Error Handling

- If `fixtures/<suite>/` does not exist: list available suites from `fixtures/`
- If `fixtures/<suite>/cases/<case>.yaml` does not exist: list available cases
- If `setup-test.sh` fails: show the error and stop
