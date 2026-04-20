---

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

## Step 0.5: Param Resolution

After `workflow create`, check the response for an `unresolved` field. If present:

1. Read the `candidates` array for each unresolved param
2. If candidates exist: present them to the user and ask which one is correct
3. If no candidates: ask the user for a more specific identifier
4. Call `_debo workflow create` again with the corrected params
5. Repeat until all params resolve, then continue with normal workflow execution

If no `unresolved` field: all params were resolved automatically, proceed with Step 1.

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
  CREATE_JSON=$(_debo workflow create --workflow <id>)
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

The response includes a `schema` field that contains all inputs and outputs for the task:

- `schema.definitions` — resolved schemas from `schemas.yml`, deduplicated across all loaded files (task, blueprints, rules)
- `schema.params` — file inputs with resolved `path`, `exists`, `content` (parsed YAML/JSON or null), and `$ref` to definitions
- `schema.result` — expected outputs with the same resolution: resolved `path`, `exists`, `content`, and `$ref` to definitions

Params and result use identical resolution logic. The AI uses param/result content directly from the response. File names and paths are never mentioned in task body text. If an entry has `exists: true`, its `content` is the parsed file. If `exists: false`, the file does not exist yet and `content` is null.

Some result properties are intentionally open in the base schema and only gain structure through extensions — e.g. `config` in the data model is `{ type: object }` in the base, but blueprints/rules add type-specific properties like `image_style.aspect_ratio`. Always use `schema` (from `workflow instructions`) over the base task schema when both are available.

### 2a-resolve. Param Resolution

Most params are resolved automatically by **code resolvers** at `workflow create` time (Step 0.5). Params with `resolve:` in the workflow definition are handled by the CLI before any task runs.

For remaining unresolved params, check loaded rules for a `provides: <param>` field (legacy provider rules). For each expected param that is **not yet set** (not in `--params` and not resolved by a code resolver or previous step), find a loaded rule that provides it and execute that rule's instructions to set the param.

- If a code resolver handled it → param is already set, skip
- If a provider rule exists → execute it, set the param
- If no provider rule exists → leave the param unset (the task will handle it, e.g. ask the user)
- If the param is already set → skip the provider rule entirely

**Prefer code resolvers** for new params. Provider rules are a legacy mechanism — use `resolve:` in workflow params instead.

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

Task results are driven by the `result:` schema in the task's frontmatter. The `schema.result` field (from `workflow instructions`) is the single source of truth for what to fill.

**File results** (result keys with `path:`):
Pass all results — both file and data — as a single JSON object via `--data` on `workflow done`.
The CLI serializes to the target format, validates the schema on the raw data, and runs semantic validators.

By default, file results are staged (written to a `.debo` suffix path) and flushed atomically on stage transition. Results declared with `flush: immediate` in the task's result schema are written to their final path as soon as `workflow done` completes — the AI does not need to pass any flush flag.

**Direct-submission file results** (`submission: direct`):

The file is written by an external tool (Playwright screenshot, CLI invocation, etc.). The task code produces the file; the workflow CLI only runs post-write validation. Such results are registered via `workflow result` when produced outside the normal `--data` path.

```bash
_debo workflow done --workflow $WORKFLOW_NAME --task <task-id> \
  --data '{"vision": {"product_name": "...", "description": "..."}}'
```

> ⛔ **GLOBAL RULE — no exceptions:**
> File results declared in `result:` frontmatter MUST be submitted via `workflow done --data`.
> Writing a result file directly with the Write tool or any other mechanism is **forbidden**.
> `workflow done` will fail if it detects a file at a declared result path that was not submitted through the workflow.
> The only exception to the `workflow done --data` pattern is `submission: direct` — those results are written by an external tool and registered via `workflow result`.

### 2c. Mark Task Done

```bash
_debo workflow done --workflow $WORKFLOW_NAME --task <task-id> [--data '<json>'] [--summary <text>]
```

- `--data '<json>'` — pass all results (file and data) as a single JSON object.
  The engine serializes file results to disk, validates all results against the
  `schema.definitions`, and marks the task done.
- `--summary` — short result description shown in Storybook panel. Skip for self-explanatory tasks.
- Results with `default:` in `schema.result` are auto-filled if not provided.

**Data flow model:** Tasks declare their outputs via `result:` in frontmatter with a JSON Schema. The engine validates results against `schema` (base + blueprint extensions + rule constraints). When all tasks in a stage complete, the engine collects data results into the workflow scope and expands pending stages whose `each:` keys are now available.

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

Then ask the user the prompt. When the user answers, pass the answer via `--data` on the next `workflow done` call. The next CLI call (`done`, `result`, or `instructions`) automatically transitions the workflow back to `running`.

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
- Start the hook workflow: `_debo workflow create --workflow css-generate`
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

Runs after optimize pass, only when `--research` flag was set at skill invocation.

**During the workflow:** append `--log` to every `_debo workflow …` CLI call so entries in `designbook/dbo.log` carry `tagged: true`. This is the canonical marker the audit filters on.

**After the workflow:** load `designbook-skill-creator` and follow [`resources/research.md`](../../designbook-skill-creator/resources/research.md). The audit combines:

- archived `tasks.yml` (loaded task files, rules, blueprints)
- tagged entries in `dbo.log` (CLI failures, retries, unresolved params)
