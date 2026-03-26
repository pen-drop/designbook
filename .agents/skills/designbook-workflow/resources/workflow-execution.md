---
when: {}
---

# Workflow Execution Rules

## Scope Boundary

> ⛔ **OpenSpec artifacts are out of scope.** During any `debo-*` workflow, never read, load, or reference OpenSpec specs — change files, delta specs, main specs, or any artifact under `.agents/changes/` or similar OpenSpec paths. Task files and rule files come exclusively from `.agents/skills/*/tasks/` and `.agents/skills/*/rules/`.

---

## Phase 0: Bootstrap

> Run FIRST — nothing works without it. Bundle ALL CLI calls in one Bash block so bootstrap runs only once.

```bash
# Inline helper — bootstraps on first call, skips if already done
_debo() {
  if [ -z "$DESIGNBOOK_ROOT" ]; then
    dir="$PWD"
    while [ "$dir" != "/" ]; do
      [ -f "$dir/designbook.config.yml" ] && DESIGNBOOK_ROOT="$dir" && break
      dir=$(dirname "$dir")
    done
    [ -z "$DESIGNBOOK_ROOT" ] && echo "ERROR: designbook.config.yml not found" && return 1
    _DEBO_CMD=$(sed -n 's/^cmd: *//p' "$DESIGNBOOK_ROOT/designbook.config.yml" | sed "s/^['\"]//;s/['\"]$//")
    [ -z "$_DEBO_CMD" ] && _DEBO_CMD="npx storybook-addon-designbook"
    # Bake cmd into a wrapper at definition time so "$@" is never re-eval'd.
    # This avoids zsh glob-expanding JSON args that contain [ or {.
    eval "_debo_exec() { (cd \"\$DESIGNBOOK_ROOT\" && $_DEBO_CMD \"\$@\"); }"
    eval "$(_debo_exec config)"
  fi
  _debo_exec "$@"
}
```

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
  CREATE_JSON=$(_debo workflow create --workflow <id> --workflow-file <abs-path-to-debo-*.md> [--parent <name>])
  WORKFLOW_NAME=$(echo "$CREATE_JSON" | jq -r '.name')
fi
```

**Resume path:** when continuing an existing workflow, set `WORKFLOW_NAME=$EXISTING` and skip directly to Step 3 (Load Intake Instructions). Do **not** re-run `workflow create` or `workflow plan` — both have already been executed and tasks.yml is already populated.

Use the **absolute path** for `--workflow-file` (derive from `$DESIGNBOOK_ROOT`).

### 2. Create Workflow (resolves ALL stages)

```bash
CREATE_JSON=$(_debo workflow create --workflow <id> --workflow-file <abs-path-to-debo-*.md> [--parent <name>])
WORKFLOW_NAME=$(echo "$CREATE_JSON" | jq -r '.name')
```

The CLI resolves **every stage** at create time — both intake and execution:
- Reads `stages:` from the workflow frontmatter
- For each stage: resolves task_file, rules, config_rules, config_instructions
- Stores everything in `stage_loaded` in tasks.yml
- Outputs JSON with `name` + `stages` + `stage_resolved`

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
- Complete the hook workflow fully before continuing

### 5. Plan (expand items into tasks)

Build items array from intake results: `[{ "stage": "<name>", "params": { ... } }, ...]`. Expand loops (3 components → 3 items).

```bash
_debo workflow plan \
  --workflow $WORKFLOW_NAME \
  --params '<global_params_json>' \
  --items '<items_json>'
```

The CLI reads `stage_loaded` from tasks.yml and expands items into tasks: validates params, generates IDs, expands file paths, computes `depends_on`. Outputs the plan as JSON.

Display the plan summary, then proceed immediately to Phase 2.

---

## Phase 2: Execute

The main agent executes all tasks sequentially. For each task:

1. Load instructions: `_debo workflow instructions --workflow $WORKFLOW_NAME --stage <task-stage>`
2. Read task data from tasks.yml: `params`, `files` + top-level `params`
3. Create files following task file instructions + rule constraints
4. Validate + done in one block: `_debo workflow validate --workflow $WORKFLOW_NAME --task <id> && _debo workflow done --workflow $WORKFLOW_NAME --task <id>`

> Rules are hard constraints — apply silently, never mention to the user.
> `validate` MUST exit 0 before `done`. Never skip validation.

### After Hooks

When the last `workflow done` auto-archives, process `after` entries from workflow frontmatter:
- Prompt: "Run `/<workflow-id>` next?"
- If accepted → start it with `--parent $WORKFLOW_NAME`
