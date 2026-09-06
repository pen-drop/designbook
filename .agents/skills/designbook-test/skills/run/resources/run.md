---
name: run
description: Set up a fresh test workspace from a fixture case and execute its prompt.
---

# run

Set up a fresh test workspace from a fixture case and execute its prompt.

## Inputs and paths

Parse `run <suite> [<case>] [--workspace <path>] [--validate <workflow>]`.
`--workspace` is optional. Without it, use `workspaces/<suite>` as before. With
it, resolve the path from the current repository root, rebuild that directory
through `setup-workspace.sh --into`, and use it for the whole run. Every
parallel run must pass a different workspace path; never share one path between
runs.

Set `WORKSPACE` to the resolved absolute path and use it in every command below.
The suite name still selects fixtures; it does not select the workspace when
`--workspace` is present.

## Paths (Drupal-layout workspace)

After `setup-workspace.sh` the workspace is a Drupal tree:

| Path                                                                   | Use for                                                               |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `$WORKSPACE` (**workspace root**)                                      | All `_debo workflow *`, `sync-to`, `config`, `eval "$(_debo config)"` |
| `$WORKSPACE/web/themes/custom/test_integration_drupal` (**theme dir**) | Storybook start/status/stop only; theme git repo for fixture diffs    |

`designbook.config.yml` lives at the **workspace root**. Never put a second copy in the theme dir (it shadows the root). `setup-test.sh` merges case config overrides into the root config.

## 1. List cases (no case argument)

If only `<suite>` is provided:

1. List all `.yaml` files in `fixtures/<suite>/cases/`
2. Show them as a numbered list with the `fixtures` field from each case
3. Ask the user to pick one

## 2. Setup workspace

Always create a fresh workspace — never reuse an existing one.

1. Resolve `WORKSPACE`: `workspaces/<suite>` by default, or the explicit `--workspace` path.
2. Run `./scripts/setup-workspace.sh <suite> --into "$WORKSPACE"` — this always rebuilds the selected directory with Storybook infrastructure and `pnpm install`.
3. Run: `./scripts/setup-test.sh <suite> <case> --into "$WORKSPACE"` — layers fixtures and merges case config into the workspace-root `designbook.config.yml`.
4. Report the workspace path to the user.

## 3. Start services

### 3a. Storybook (theme dir)

```bash
cd "$WORKSPACE/web/themes/custom/test_integration_drupal"
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"   # may resolve config from parent workspace root
_debo storybook start
```

Report the Storybook URL (`_debo storybook status` → `url`).

### 3b. Drupal (when the suite needs the backend)

For `drupal-*` suites (or any case whose prompt runs `ddev` / `sync-to` / `sync-verify`):

```bash
./scripts/start-drupal-workspace.sh --workspace "$WORKSPACE"
```

Then smoke-check from the **workspace root**:

```bash
cd "$WORKSPACE"
ddev drush status
ddev drush pm:list --status=enabled --format=list | rg -i 'designbook|ui_patterns|layout_builder' || true
```

If `pm:enable` fails on a missing module name, fix the fixture / active `core.extension` before continuing — do not invent modules.

## 4. Display prompt and execute

1. Read `fixtures/<suite>/cases/<case>.yaml`
2. Display the `prompt` field to the user
3. **Confirmation:** If the user already invoked `debo-test run <suite> <case>` (case name present), treat that as yes — do **not** ask y/n. Only ask `"Execute this prompt in the workspace? (y/n)"` when the case was chosen interactively in step 1.
4. Follow the case's domain intake on this thread, including its shared builder. Keep a copy of the saved definition before handing the path to execute-workflow.
5. Drive the executor with one fresh subagent per existing task. Give each subagent the workspace root, saved document path, task ID and case inputs; it loads `workflow instructions <path> --task <id>`, starts the task, produces its outputs, and calls done. It returns completion evidence or a concrete recorded blockade. Wait for dependencies before dispatching their consumers. Subagents load embedded task context, not source skill files. They never generate new tasks.
6. After completion, compare the saved definition with its before-execution copy. Collect the run path, summary and artifact checks. A changed definition fails the case.
7. When the task cannot proceed from case inputs, return the exact missing input to the parent; the parent asks the user. A blocked task remains resumable in the same document.

Restart stale Storybook from the theme directory before captures using `storybook start --force`. Stop services when the testing session ends.

## 5. Validate (optional — only if `--validate <workflow>` was passed)

Skip this step entirely when no `--validate` option was given.

**Skip when the main prompt already ran the same validate workflow.** If the case `prompt` already instructs running `/debo <validate-workflow>` (e.g. PART B runs `sync-verify`) and that workflow is archived `completed`, do not re-run it; go to step 6 with that id.

**Gates by validate workflow:**

| Validate workflow                            | Proceed when                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `design-verify` (scores vs design reference) | Case prompt has a `reference_url` (or equivalent). Otherwise report skipped (no reference) and continue to step 6. |
| `sync-verify` (scores backend vs Storybook)  | Storybook is running and the main-run summary (or case) names the story/scene. No design `reference_url` required. |

After the main run completes, invoke the selected verification intake with the produced story and case reference. Execute its saved document with the same per-task subagent policy. The verification intake owns the separate automatic repair handoff. Record each check and repair path.

## 6. Workflow summary (after workflow completion)

After the workflow completes, retrieve and display the summary from the **workspace root**:

```bash
cd "$WORKSPACE"
npx storybook-addon-designbook workflow summary <path> --json
```

Display the full JSON output so the user can review scores before deciding on a snapshot. When a validate workflow ran (step 5), display its summary too, passing its saved document path.

## 7. Snapshot offer

After the workflow completes:

1. `cd` into the theme dir (`$WORKSPACE/web/themes/custom/test_integration_drupal`) — that is the git repo root for the workspace
2. Run `git diff --name-only` and `git ls-files --others --exclude-standard` to find changed/new files
3. Exclude `.agents/`, `.claude/`, `.storybook/`, `node_modules/` from the list
4. Also list new config under `$WORKSPACE/web/sites/default/files/sync/` when present (outside the theme git root — report paths relative to workspace root)
5. Display the list of changed files to the user
6. Ask: "Save as fixture? Enter name (default: <case>) or 'n' to skip"
7. If the user provides a name (or accepts default):
   - For each changed/new file under the theme, copy it to `fixtures/<suite>/<fixture-name>/` preserving the theme-relative path
   - Report: "✓ Fixture saved to fixtures/<suite>/<fixture-name>/"
8. If the user declines: do nothing, workspace remains

## Case evidence and scoring

When a case declares `evidence`, collect its listed theme-relative files plus changed
case artifacts through the shared [scorer](../../../resources/eval-score.mjs).
`setup-test.sh`'s fixture commit is the baseline. Keep that commit fixed throughout
the case; pass `--baseline <commit>` if the theme HEAD changes. The scorer exposes
parsed `fileContents` and `baselineContents`, SHA-256 `fileHashes` and
`baselineHashes`, and `unchangedFiles`. Missing files never count as preserved.
`evidence.mappings` selects bounded `{file, data, record?}` JSONata evaluations for
semantic assertions. Component inventory contains existing metadata paths only.

Before execution, bind each case observation to a concrete story URL, selector,
viewport and expected value in the saved definition. After the real commands and
browser interactions, save one JSON evidence file per execution:

```json
{
  "build": {
    "command": "pnpm build-storybook",
    "cwd": "/absolute/workspace/web/themes/custom/test_integration_drupal",
    "exitCode": 0,
    "stdout": "<actual captured build output>"
  },
  "checks": [
    {
      "url": "<actual checked story URL>",
      "result": { "ok": true },
      "observations": { "<case observation key>": "<observed value>" }
    }
  ]
}
```

Copy the complete actual `CHECK_RESULT` object into `result`; the abbreviated
example shows only the field assertions consume. Record observations from browser
measurements/interactions at the declared selectors and viewport, with supporting
logs/screenshots beside the evidence. Expected values in a case are acceptance
criteria, never substitutes for observations. A static build and a console check
alone do not establish behavior.

Run from the workspace root, using absolute paths:

```bash
node <repo>/.agents/skills/designbook-test/resources/eval-score.mjs \
  --workflow <saved-tasks.yml> --case <case.yaml> \
  --data-dir <theme>/designbook --theme-dir <theme> \
  --definition-before <definition-before.yml> --evidence <evidence.json> \
  --snapshot <artifact-snapshot.json>
```

The before-file contains only the definition object. Require a positive assertion
count, all assertions passed and no failures. The process exit code alone does not
mean the case passed. Every execution must contain the exact nonempty planned task
set, completed state and valid required results; the scorer exposes this as
`runs[].complete`. The workflow-ID maps remain useful for single-run cases;
`runs[]` is the execution-path identity for repeated cases.

When `repeat: {count: 2, same_prompt: true}` is present, setup once and complete
step 4 twice with the identical domain request. Save a distinct definition and
execution path for each run. Capture the first run's artifact snapshot and evidence
before starting the second. The first scoring call can fail the not-yet-complete
repeat assertions; it still writes its snapshot. After both runs, write a JSON
manifest array with one entry per execution:

```json
[
  {
    "workflow": "<first-tasks.yml>",
    "definitionBefore": "<first-before.yml>",
    "evidence": "<first-evidence.json>",
    "artifactSnapshot": "<first-snapshot.json>"
  },
  {
    "workflow": "<second-tasks.yml>",
    "definitionBefore": "<second-before.yml>",
    "evidence": "<second-evidence.json>",
    "artifactSnapshot": "<second-snapshot.json>"
  }
]
```

Pass `--runs <manifest.json>` on the final scoring call, with `--workflow` and
`--definition-before` selecting the second execution. Collect both workflow summaries.
Each run keeps its own definition comparison, command results, browser observations
and snapshot even when both definitions have the same ID. Rebuilding or relayering
between these two executions invalidates the repeat case.
