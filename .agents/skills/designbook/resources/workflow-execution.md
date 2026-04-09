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
- Creating file content and writing it via `write-file`
- Running commands or capturing screenshots
- Any other work described in the task file

**Writing files:**
```bash
cat <<'EOF' | _debo workflow write-file $WORKFLOW_NAME <task-id> --key <key>
<file content>
EOF
```

If `valid: false` → fix content and call `write-file` again until valid.

### 2c. Mark Task Done

```bash
_debo workflow done --workflow $WORKFLOW_NAME --task <task-id> [--params <json>] [--summary <text>]
```

Pass `--params` when the task produces params that expand subsequent tasks (e.g. iterables for stages with `each`). The CLI decides whether to use `plan` or `append` mode based on the workflow state.

Pass `--summary` with a short result description when the task outcome is not obvious from the title alone. The summary is shown in the Storybook panel next to the task title. Skip it for self-explanatory tasks (e.g. "Capture Reference: sm/header"). Use it for tasks that produce results the user would want to see at a glance (e.g. "3 issues found", "12 → 4 consolidated", "fontSize 14px → 48px").

**Params format for stages with `each`:**
```json
{
  "component": [
    {"component": "header", "group": "Shell"},
    {"component": "footer", "group": "Shell"}
  ],
  "scene": [
    {"scene": "design-system:shell"}
  ]
}
```

### 2d. Follow the Response

Parse the `RESPONSE:` JSON line and act accordingly:

**Next task in same stage:**
```json
{ "stage": "component", "step_completed": "create-component", "next_step": "create-component" }
```
→ Continue to the next task (go to 2a).

**Stage transition:**
```json
{ "stage": "test", "transition_from": "component", "next_stage": "test", "next_step": "screenshot" }
```
→ New stage. Load instructions for the new step (go to 2a).

**Waiting for params (user input required):**
```json
{ "stage": "preview", "waiting_for": { "user_approved": { "type": "boolean", "prompt": "Preview OK?" } } }
```
→ Ask the user the prompt. Then call `done` again with the answer as `--params`.

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

1. Collect all files written during the workflow (from `write-file` results)
2. Review for: performance, maintainability, accessibility, design-system consistency
3. Output numbered suggestions — do not apply, only suggest

---

## Research Pass (`--research`, internal)

Runs after optimize pass, only when `--research` flag was set. Internal diagnostic for skill development.

1. Replay conversation — log every CLI failure, retry, ambiguity, undocumented behavior
2. Root-cause each issue (workflow-execution.md, SKILL.md, cli-reference.md, task/rule file, CLI bug)
3. Output diagnostic report — do not modify files, only report
