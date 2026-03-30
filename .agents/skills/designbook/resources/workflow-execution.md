---
when: {}
---

# Workflow Execution Rules

## Scope Boundary

> ⛔ **OpenSpec artifacts are out of scope.** During any `debo` workflow, never read, load, or reference OpenSpec specs — change files, delta specs, main specs, or any artifact under `.agents/changes/` or similar OpenSpec paths. Task files and rule files come exclusively from `.agents/skills/*/tasks/` and `.agents/skills/*/rules/`.

---

## Phase 0: Bootstrap

> Run FIRST — nothing works without it. Bundle ALL CLI calls in one Bash block so bootstrap runs only once.

```bash
# Inline helper — bootstraps on first call, skips if already done
_debo() {
  if [ -z "$DESIGNBOOK_CMD" ]; then
    export DESIGNBOOK_CMD="npx storybook-addon-designbook"
  fi
  if [ -z "$DESIGNBOOK_HOME" ]; then
    eval "$(${=DESIGNBOOK_CMD} config)"
  fi

  ${=DESIGNBOOK_CMD} "$@"
}
```
Show all DESGIGNBOOK_* variables to the user.

All subsequent CLI calls use `_debo <command>` — bootstrap is skipped after the first call. Bundle multiple commands in one Bash block to maximise reuse.

If no config found → stop and ask the user.

---

## Phase 1: Intake & Planning (Main Agent)

### 1. Resume Check + Create (one block)

Bundle resume check and create in one Bash block:

```bash
EXISTING=$( list --workflow <id>)
if [ -n "$EXISTING" ]; then
  # ask user: continue or fresh?
  # continue → WORKFLOW_NAME=$EXISTING  (skip workflow create — tasks.yml already exists; go straight to Phase 1 Step 3)
  # fresh    →  abandon --workflow $EXISTING; then create a new one below
  echo "EXISTING:$EXISTING"
else
  CREATE_JSON=$( create --workflow <id> --workflow-file <abs-path-to-workflow.md> [--parent <name>])
  WORKFLOW_NAME=$(echo "$CREATE_JSON" | jq -r '.name')
fi
```

**Resume path:** when continuing an existing workflow, set `WORKFLOW_NAME=$EXISTING` and skip directly to Step 3 (Load Intake Instructions). Do **not** re-run `workflow create` or `workflow plan` — both have already been executed and tasks.yml is already populated.

Use the **absolute path** for `--workflow-file`. Workflow files live at `$DESIGNBOOK_HOME/.agents/skills/designbook/<concern>/workflows/<workflow-id>.md` (e.g. `$DESIGNBOOK_HOME/.agents/skills/designbook/vision/workflows/vision.md`).

### 2. Create Workflow (resolves ALL steps)

```bash
CREATE_JSON=$( create --workflow <id> --workflow-file <abs-path-to-workflow.md> [--parent <name>])
WORKFLOW_NAME=$(echo "$CREATE_JSON" | jq -r '.name')
```

The CLI resolves **every step** at create time — both intake and execution:
- Reads `stages:` from the workflow frontmatter (grouped format with optional `each`)
- For each step: resolves task_file, rules, config_rules, config_instructions
- Intake is resolved by convention (`intake--<workflow-id>.md` or `<prefix>:intake`) — it is NOT listed in stage steps
- Stores everything in `stage_loaded` in tasks.yml
- Outputs JSON with `name` + `steps` + `stages` + `step_resolved`

### 3. Load Intake Instructions

Intake is an **engine convention** — it always runs first, before any stage. It is not declared in stages.

```bash
 instructions --workflow $WORKFLOW_NAME --stage <intake-stage>
```

Returns JSON: `{ task_file, rules, config_rules, config_instructions }`.
Load the `task_file` and all `rules[]` files. Apply `config_rules[]` as constraints.

The intake gathers information from the user and produces **iterables** — arrays of items that stages will iterate over (e.g. components to create, scenes to build).

### 4. Before Hooks

For each `before` entry in workflow frontmatter:
- Check `reads:` gate on the referenced workflow's intake task file — skip if missing
- Apply policy: `always` → run, `if-never-run` → check `workflow list --include-archived`, `ask` → prompt user
- Resolve workflow name to file: `before: workflow: css-generate` → `$DESIGNBOOK_HOME/.agents/skills/designbook/css-generate/workflows/css-generate.md`
- Complete the hook workflow fully before continuing

### 5. Plan (expand iterables into tasks)

Build iterables from intake results and pass them as named arrays in `--params`. Stages with `each: <name>` auto-expand all their steps for each item in the corresponding iterable.

```bash
 plan \
  --workflow $WORKFLOW_NAME \
  --params '<params_json>' \
  [--engine <name>]
```

**Params format:**

```json
{
  "component": [
    {"component": "header", "group": "Shell", "slots": ["navigation"]},
    {"component": "footer", "group": "Shell", "slots": ["navigation"]}
  ],
  "scene": [
    {"scene": "design-system:shell"}
  ]
}
```

**How the CLI expands:**

- For each stage with `each: <name>`: creates one task per step × item in `params[name]`
- For stages without `each`: creates one singleton task per step
- Intake steps are excluded (handled by engine convention)

**Example expansion:**

```yaml
# Workflow declares:
stages:
  component:
    each: component
    steps: [create-component]
  scene:
    each: scene
    steps: [create-scene]
  test:
    each: scene
    steps: [screenshot, resolve-reference, visual-compare, polish]
```

With `params.component` (2 items) and `params.scene` (1 item):
- `component` stage: 2 tasks (create-component × 2)
- `scene` stage: 1 task (create-scene × 1)
- `test` stage: 4 tasks (4 steps × 1 scene)
- **Total: 7 tasks**, all auto-generated

The optional `--engine` flag overrides the engine declared in the workflow.md frontmatter (`engine: direct` or `engine: git-worktree`). Precedence: `--engine` flag > frontmatter `engine:` > auto (git-worktree if git repo, else direct). The `debo <workflow> --engine <name>` shorthand passes through to `workflow plan`.

Display the plan summary, then proceed immediately to Phase 2.

---

## Phase 2: Execute

The main agent executes all tasks sequentially. For each task:

1. Load instructions: ` instructions --workflow $WORKFLOW_NAME --stage <task-step>`
2. Read task data from tasks.yml: `params`, `files` + top-level `params`
3. For each file declared in the task, create the content and write it via CLI:
   ```bash
   cat <<'EOF' |  write-file $WORKFLOW_NAME <task-id> --key <key>
   <file content>
   EOF
   ```
   The CLI writes the file (engine decides where), validates it immediately, and returns JSON: `{ "valid": true|false, "errors": [...], "file_path": "..." }`
4. If `valid: false` → fix the content and call `write-file` again until all files are green
5. Mark task done: ` done --workflow $WORKFLOW_NAME --task <id>`

> Rules are hard constraints — apply silently, never mention to the user.
> `write-file` validates on write. `workflow done` is a gate-check only — it rejects if any file is not green.

### Stage-based Response

Every `workflow done` response ends with a `RESPONSE:` JSON line. Parse it and act accordingly:

**Next step in same stage:**
```json
{ "stage": "component", "step_completed": "create-component", "next_step": "create-component" }
```
→ Continue to the next task.

**Stage transition:**
```json
{ "stage": "test", "transition_from": "committed", "next_stage": "test", "next_step": "screenshot" }
```
→ Stage changed. Continue to the next step in the new stage.

**Waiting for params (user input required):**
```json
{ "stage": "preview", "waiting_for": { "user_approved": { "type": "boolean", "prompt": "Preview unter http://localhost:6006 — passt alles?" } } }
```
→ Ask the user the prompt question. Provide the answer and re-run the transition.

**Workflow complete:**
```json
{ "stage": "done" }
```
→ Workflow archived. Process after hooks.

### Stage Vocabulary

Workflows declare stages in their frontmatter as a grouped structure. Stage names are semantic — they describe what the stage iterates over or does:

| Stage pattern | Role | `each` |
|-------|------|--------|
| `component` | Create components | `component` |
| `scene` | Create scenes | `scene` |
| `execute` | Singleton work (no iteration) | — |
| `transform` | Transform/generate (no iteration) | — |
| `test` | Visual testing (screenshot, compare, polish) | `scene` or `component` |
| `preview` | Manual review (Storybook preview, user approval) | — |

Implicit stages (`committed`, `finalizing`) are managed by the engine and not declared in frontmatter.

### Merge Flow (git-worktree engine)

When all tasks are done and the engine is `git-worktree`, the `finalizing → done` transition requires a `merge_approved` param. The response will contain `waiting_for` with a merge prompt. Ask the user, then call ` merge --workflow $WORKFLOW_NAME`.

For `direct` engine workflows, `finalizing → done` happens automatically (auto-archive).

### After Hooks

When the last `workflow done` auto-archives, process `after` entries from workflow frontmatter:
- Prompt: "Run `/<workflow-id>` next?"
- If accepted → start it with `--parent $WORKFLOW_NAME`
