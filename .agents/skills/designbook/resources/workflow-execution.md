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
EXISTING=$(_debo workflow list --workflow <id>)
if [ -n "$EXISTING" ]; then
  # ask user: continue or fresh?
  # continue → WORKFLOW_NAME=$EXISTING  (skip workflow create — tasks.yml already exists; go straight to Phase 1 Step 3)
  # fresh    → _debo workflow abandon --workflow $EXISTING; then create a new one below
  echo "EXISTING:$EXISTING"
else
  CREATE_JSON=$(_debo workflow create --workflow <id> --workflow-file <abs-path-to-workflow.md> [--parent <name>])
  WORKFLOW_NAME=$(echo "$CREATE_JSON" | jq -r '.name')
fi
```

**Resume path:** when continuing an existing workflow, set `WORKFLOW_NAME=$EXISTING` and skip directly to Step 3 (Load Intake Instructions). Do **not** re-run `workflow create` or `workflow plan` — both have already been executed and tasks.yml is already populated.

Use the **absolute path** for `--workflow-file`. Workflow files live at `$DESIGNBOOK_HOME/.agents/skills/designbook/<concern>/workflows/<workflow-id>.md` (e.g. `$DESIGNBOOK_HOME/.agents/skills/designbook/vision/workflows/vision.md`).

### 2. Create Workflow (resolves ALL steps)

```bash
CREATE_JSON=$(_debo workflow create --workflow <id> --workflow-file <abs-path-to-workflow.md> [--parent <name>])
WORKFLOW_NAME=$(echo "$CREATE_JSON" | jq -r '.name')
```

The CLI resolves **every step** at create time — both intake and execution:
- Reads `stages:` from the workflow frontmatter (grouped format: `{ execute: { steps: [...] }, test: { steps: [...] } }`)
- For each step: resolves task_file, rules, config_rules, config_instructions
- Stores everything in `stage_loaded` in tasks.yml
- Outputs JSON with `name` + `steps` + `stages` + `step_resolved`

### 3. Load Intake Instructions

```bash
_debo workflow instructions --workflow $WORKFLOW_NAME --stage <intake-stage>
```

Returns JSON: `{ task_file, rules, config_rules, config_instructions }`.
Load the `task_file` and all `rules[]` files. Apply `config_rules[]` as constraints.

### 4. Before Hooks

For each `before` entry in workflow frontmatter:
- Check `reads:` gate on the referenced workflow's intake task file — skip if missing
- Apply policy: `always` → run, `if-never-run` → check `workflow list --include-archived`, `ask` → prompt user
- Resolve workflow name to file: `before: workflow: css-generate` → `$DESIGNBOOK_HOME/.agents/skills/designbook/css-generate/workflows/css-generate.md`
- Complete the hook workflow fully before continuing

### 5. Plan (expand items into tasks)

Build items array from intake results: `[{ "step": "<name>", "params": { ... } }, ...]`. Expand loops (3 components → 3 items).

```bash
_debo workflow plan \
  --workflow $WORKFLOW_NAME \
  --params '<global_params_json>' \
  --items '<items_json>' \
  [--engine <name>]
```

The CLI reads `stage_loaded` from tasks.yml and expands items into tasks: validates params, generates IDs, expands file paths, computes `depends_on`. Each task gets a `step` (work unit name) and `stage` (parent grouping: execute, test, preview). Outputs the plan as JSON.

The optional `--engine` flag overrides the engine declared in the workflow.md frontmatter (`engine: direct` or `engine: git-worktree`). Precedence: `--engine` flag > frontmatter `engine:` > auto (git-worktree if git repo, else direct). The `debo <workflow> --engine <name>` shorthand passes through to `workflow plan`.

Display the plan summary, then proceed immediately to Phase 2.

---

## Phase 2: Execute

The main agent executes all tasks sequentially. For each task:

1. Load instructions: `_debo workflow instructions --workflow $WORKFLOW_NAME --stage <task-step>`
2. Read task data from tasks.yml: `params`, `files` + top-level `params`
3. Create files following task file instructions + rule constraints
4. Validate + done in one block: `_debo workflow validate --workflow $WORKFLOW_NAME --task <id> && _debo workflow done --workflow $WORKFLOW_NAME --task <id>`

> Rules are hard constraints — apply silently, never mention to the user.
> `validate` MUST exit 0 before `done`. Never skip validation.

### Stage-based Response

Every `workflow done` response ends with a `RESPONSE:` JSON line. Parse it and act accordingly:

**Next step in same stage:**
```json
{ "stage": "execute", "step_completed": "create-component", "next_step": "create-scene" }
```
→ Continue to the next step.

**Stage transition:**
```json
{ "stage": "test", "transition_from": "committed", "next_stage": "test", "next_step": "visual-diff" }
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

Workflows declare stages in their frontmatter as a grouped structure:

| Stage | Role | Skipped when |
|-------|------|-------------|
| `execute` | Main work: create components, scenes, tokens, etc. | Never — always present |
| `test` | Automated tests (visual diff) | No test steps declared |
| `preview` | Manual review (Storybook preview, user approval) | No preview steps declared |

Implicit stages (`committed`, `finalizing`) are managed by the engine and not declared in frontmatter.

### Merge Flow (git-worktree engine)

When all tasks are done and the engine is `git-worktree`, the `finalizing → done` transition requires a `merge_approved` param. The response will contain `waiting_for` with a merge prompt. Ask the user, then call `_debo workflow merge --workflow $WORKFLOW_NAME`.

For `direct` engine workflows, `finalizing → done` happens automatically (auto-archive).

### After Hooks

When the last `workflow done` auto-archives, process `after` entries from workflow frontmatter:
- Prompt: "Run `/<workflow-id>` next?"
- If accepted → start it with `--parent $WORKFLOW_NAME`
