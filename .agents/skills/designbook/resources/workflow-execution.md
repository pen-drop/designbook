---
when: {}
---

# Workflow Execution Rules

## Scope Boundary

> **OpenSpec artifacts are out of scope.** During any `debo` workflow, never read, load, or reference OpenSpec specs — change files, delta specs, main specs, or any artifact under `.agents/changes/` or similar OpenSpec paths. Task files, rule files, and blueprint files come exclusively from `.agents/skills/*/tasks/`, `.agents/skills/*/rules/`, and `.agents/skills/*/blueprints/`.

---

## Core Principle: Response-Driven Execution

The AI does not decide what to do next. Every CLI command returns a JSON response that tells the AI exactly what the next action is. The AI reads the response, acts on it, and calls the next command. This loop continues until the response says `"stage": "done"`.

**The AI never:**
- Constructs task IDs manually (they come from CLI responses)
- Decides which stage or task comes next (the CLI decides)
- Reads tasks.yml directly to determine workflow state (use CLI commands)
- Treats any task specially (intake is a regular task like any other)

**The AI always:**
- Parses the JSON response from every CLI call
- Acts on what the response says (`next_step`, `waiting_for`, `dispatch`, `done`)
- Loads task instructions from the paths provided in the response

---

## Untracked Workflows (`track: false`)

Workflows with `track: false` in frontmatter skip the entire lifecycle (no `workflow create`, no `done`). They are utility commands, not artifact-producing workflows.

1. Bootstrap (`_debo` helper + `eval config`)
2. Load the workflow file and read its instructions
3. Execute CLI commands directly — no tracking, no tasks.yml

---

## Step 0: Precondition Check

**Before creating a workflow**, verify that all required inputs exist. Do not call `workflow create` until all preconditions pass.

1. **Bootstrap config only** — run `eval "$(_debo config)"` to get `$DESIGNBOOK_HOME` and `$DESIGNBOOK_DATA`
2. **Read the workflow file** to identify the first step (the intake step)
3. **Locate the first task file** by convention:
   - Step `<workflow>:intake` → `$DESIGNBOOK_HOME/.agents/skills/designbook/<concern>/tasks/intake--<workflow>.md`
   - Step `create-<name>` → `$DESIGNBOOK_HOME/.agents/skills/designbook/<concern>/tasks/create-<name>.md`
4. **Read the task file's frontmatter** and check each `reads:` entry:
   - **Non-optional reads**: Check the file/directory exists. If missing:
     - Has `workflow:` → tell the user which workflow to run first (e.g. "Run `/designbook vision` first")
     - No `workflow:` → report the missing file
   - **Optional reads** (`optional: true`): Skip — missing is fine
5. **Scan rules** for the first step in `<concern>/rules/` and any cross-cutting rules referenced. Check file-existence preconditions (e.g. vision-context requires `vision.md`)
6. **If any precondition fails** → report all missing prerequisites to the user in one message. Do **not** create the workflow. Suggest the workflows or actions needed to satisfy them.
7. **If all preconditions pass** → proceed to Step 1.

---

## Step 1: Bootstrap

> Run at the top of **every** Bash block. Each Bash tool call starts a fresh shell — no state carries over.

Bootstrap includes config loading **and** workflow creation in a single block:

```bash
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"

# Check for existing workflow or create new one
EXISTING=$(_debo workflow list --workflow <id>)
if [ -n "$EXISTING" ]; then
  echo "EXISTING:$EXISTING"
else
  WF_FILE="$DESIGNBOOK_HOME/.agents/skills/designbook/<concern>/workflows/<id>.md"
  CREATE_JSON=$(_debo workflow create --workflow <id> --workflow-file "$WF_FILE")
  echo "$CREATE_JSON"
fi
```

> **Important:** Always use `_debo` (or `npx storybook-addon-designbook`) for CLI commands. The `DESIGNBOOK_CMD` / `designbook()` shell function from config starts the Storybook dev server — it is **not** the CLI entry point.

**Resume path:** If `EXISTING` is non-empty, ask the user: continue or fresh? If continue, set `WORKFLOW_NAME=$EXISTING` and resume from the current task. If fresh, abandon the old one first, then create.

### Create Response

The `workflow create` response contains everything the AI needs:

```json
{
  "name": "vision-2026-04-08-a3f7",
  "steps": ["vision:intake", "create-vision"],
  "stages": { "intake": { "steps": ["vision:intake"] }, "create-vision": { "steps": ["create-vision"] } },
  "engine": "direct",
  "step_resolved": {
    "vision:intake": { "task_file": "/abs/path/to/intake--vision.md", "rules": [], "blueprints": [] },
    "create-vision": { "task_file": "/abs/path/to/create-vision.md", "rules": ["/abs/path/to/rule.md"] }
  },
  "task_ids": {
    "vision:intake": "intake"
  },
  "expected_params": {
    "product_name": { "required": true, "from_step": "create-vision" },
    "description": { "required": true, "from_step": "create-vision" }
  }
}
```

Key fields:
- **`name`** — the workflow name, used in all subsequent CLI calls
- **`step_resolved`** — maps each step to its `task_file`, `rules`, and `blueprints` (absolute paths). The first task is already `in-progress`.
- **`task_ids`** — maps step names to actual task IDs. **Always use these IDs** in `workflow done --task <id>` calls — step names (e.g. `vision:intake`) are NOT valid task IDs.
- **`expected_params`** — all params required across all stages

### Create with `--params` (Child Workflows)

When `--params` is passed to `workflow create` and satisfies all required params, the first task(s) are skipped and tasks are expanded immediately:

```json
{
  "intake_skipped": true,
  "expanded_tasks": [
    { "id": "create-vision-a3f7", "step": "create-vision", "stage": "create-vision", "title": "..." }
  ]
}
```

When `intake_skipped: true` → skip directly to Step 2 with the expanded tasks.

---

## Step 2: Execute Tasks

After bootstrap, the first task is already `in-progress`. The AI reads its `task_file` from `step_resolved` and follows the instructions. Every task follows the same loop — no task gets special treatment.

### 2a. Load Task Instructions

Read the `task_file` from the `step_resolved` entry for the current step. Also read any `rules` and `blueprints` listed. Alternatively use `workflow instructions`:

```bash
_debo workflow instructions --workflow $WORKFLOW_NAME --stage <step-name>
```

Read the `task_file` and all `rules`/`blueprints`. Rules are hard constraints — apply silently, never mention to the user.

### 2a-resolve. Run Provider Rules

After loading rules, check each rule's frontmatter for a `provides: <param>` field. For each expected param that is **not yet set** (not in `--params` and not resolved by a previous step), find a loaded rule that provides it and execute that rule's instructions to set the param.

- If a provider rule exists → execute it, set the param
- If no provider rule exists → leave the param unset (the task will handle it, e.g. ask the user)
- If the param is already set → skip the provider rule entirely

Provider rules run **before** the task starts. The task sees provider-resolved params as already set.

### 2b. Do the Work

Follow the task file instructions. This could mean:
- Gathering information from the user (for tasks that collect params)
- Creating file/data results via `workflow result`
- Running commands or capturing screenshots
- Any other work described in the task file

**Before asking the user a question**, set the workflow to waiting so the Storybook panel shows the question:

```bash
_debo workflow wait --workflow $WORKFLOW_NAME --message "<the question for the user>"
```

This transitions the workflow from `running` → `waiting`, shows an amber pulse in the panel, and auto-focuses the Designbook tab. The next CLI call (`done`, `result`, or `instructions`) automatically clears the waiting state back to `running`.

**Writing results:**

Task results are driven by the `result:` schema in the task's frontmatter. The merged schema (from `workflow instructions`) is the single source of truth for what to fill.

**File results** (result keys with `path:`):
Write each file to its declared path using the Write tool. The engine auto-detects files at declared paths when `done` is called — no explicit `workflow result` needed.

**Data results** (result keys without `path:`):
Pass all data results as a single JSON object via `--data` on `workflow done`:
```bash
_debo workflow done --workflow $WORKFLOW_NAME --task <task-id> --data '{"scene": "shell", "reference": []}'
```

**External file results** (written by Playwright or other external tools):
Register via `workflow result --external`, then call `done`:
```bash
_debo workflow result --task <task-id> --key <key> --external
```

**Legacy path:** `workflow result --key <key>` (stdin) and `workflow result --key <key> --json` still work for mid-task writes that need `--flush` or for backward compatibility, but new tasks should prefer the schema-driven approach above.

### 2c. Mark Task Done

```bash
_debo workflow done --workflow $WORKFLOW_NAME --task <task-id> [--data '<json>'] [--summary <text>]
```

- `--data '<json>'` — pass all data results (result keys without `path:`) as a single JSON object. The engine distributes keys to declared results, validates each against the merged schema, and marks the task done.
- `--summary` — short result description shown in Storybook panel. Skip for self-explanatory tasks.
- Results with `default:` in the merged schema are auto-filled if not provided.
- File results at declared `path:` locations are auto-collected — no explicit registration needed.

**Data flow model:** Tasks declare their outputs via `result:` in frontmatter with a JSON Schema. The engine validates results against the merged schema (base + blueprint extensions + rule constraints). When all tasks in a stage complete, the engine collects data results into the workflow scope and expands pending stages whose `each:` keys are now available.

### 2d. Follow the Response

Parse the `RESPONSE:` JSON line and act accordingly. All responses now include `stage_progress` and `stage_complete` fields:

**Next task in same stage:**
```json
{ "stage": "component", "step_completed": "create-component", "next_step": "create-component", "stage_progress": "1/3", "stage_complete": false }
```
→ Continue to the next task (go to 2a).

**Stage transition (stage complete, scope updated):**
```json
{ "stage": "test", "transition_from": "component", "next_stage": "test", "next_step": "screenshot", "stage_progress": "3/3", "stage_complete": true, "scope_update": { "issues": [...] } }
```
→ Stage complete. Data results from the completed stage have been collected into scope (`scope_update` shows what was added). Load instructions for the new step (go to 2a).

When `scope_update` is present, it means the engine collected data results from all tasks in the completed stage and wrote them to the workflow scope. Subsequent stages with `each:` on those keys will be expanded automatically (visible in `expanded_tasks` if present).

**Waiting for params (user input required):**
```json
{ "stage": "preview", "waiting_for": { "user_approved": { "type": "boolean", "prompt": "Preview OK?" } } }
```
→ Set the workflow to waiting, then ask the user:

```bash
_debo workflow wait --workflow $WORKFLOW_NAME --message "Preview OK?"
```

Then ask the user the prompt. When the user answers, write the answer via `workflow result --key <key> --json '<data>'`, then call `done`. The next CLI call (`done`, `result`, or `instructions`) automatically transitions the workflow back to `running`.

**Workflow complete:**
```json
{ "stage": "done" }
```
→ Workflow archived. Process hooks (Step 3).

---

## Step 3: Hooks

### Before Hooks

For each `before` entry in workflow frontmatter:
- Check `reads:` gate — skip if missing
- Apply policy: `always` → run, `if-never-run` → check `workflow list --include-archived`, `ask` → prompt user
- Resolve workflow file: `before: workflow: css-generate` → `$DESIGNBOOK_HOME/.agents/skills/designbook/css-generate/workflows/css-generate.md`
- Complete the hook workflow fully before continuing

### After Hooks

When the workflow archives (response `"stage": "done"`), process `after` entries from frontmatter:
- Prompt: "Run `/<workflow-id>` next?"
- If accepted → start it with `--parent $WORKFLOW_NAME`

---

## Merge Flow (git-worktree engine)

When the engine is `git-worktree`, the `finalizing → done` transition returns `waiting_for` with a merge prompt. Ask the user, then:

```bash
_debo workflow merge --workflow $WORKFLOW_NAME
```

For `direct` engine, `finalizing → done` happens automatically (auto-archive).

---

## Optimize Pass (`--optimize`)

Runs after hooks, only when `--optimize` flag was set at invocation.

1. Collect all files written during the workflow (from `workflow result` calls)
2. Review for: performance, maintainability, accessibility, design-system consistency
3. Output numbered suggestions — do not apply, only suggest

---

## Research Pass (`--research`, internal)

Runs after optimize pass, only when `--research` flag was set. Internal diagnostic for skill development.

1. Replay conversation — log every CLI failure, retry, ambiguity, undocumented behavior
2. Root-cause each issue (workflow-execution.md, SKILL.md, cli-reference.md, task/rule file, CLI bug)
3. Output diagnostic report — do not modify files, only report
