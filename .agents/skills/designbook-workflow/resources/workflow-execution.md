---
when: {}
---

# Workflow Execution Rules

Two phases: the **main agent** runs intake and planning, then executes tasks sequentially.

Every stage starts the same way: call `workflow instructions` to get the files to load.

## Phase 0: Bootstrap

> Run FIRST — nothing works without it.

```bash
# Find config root
dir="$PWD"
while [ "$dir" != "/" ]; do
  [ -e "$dir/designbook.config.yml" ] && DESIGNBOOK_ROOT="$dir" && break
  dir=$(dirname "$dir")
done

# Read cmd from config, fallback to npx
DESIGNBOOK_CMD=$(grep '^cmd:' "$DESIGNBOOK_ROOT/designbook.config.yml" | sed "s/^cmd: *['\"]\\?//" | sed "s/['\"]\\?$//")
[ -z "$DESIGNBOOK_CMD" ] && DESIGNBOOK_CMD="npx storybook-addon-designbook"

# Export all env vars + define designbook() shell function
eval "$(cd "$DESIGNBOOK_ROOT" && $DESIGNBOOK_CMD config)"
```

After eval, `$DESIGNBOOK_CMD` points to the `designbook()` shell function which always `cd`s into the config root before running. All CLI calls work from any directory.

If no config found → stop and ask the user.

---

## Phase 1: Intake & Planning (Main Agent)

### 1. Resume Check

```bash
$DESIGNBOOK_CMD workflow list --workflow <id>
```
If non-empty → ask: "Continue `<name>` or start fresh?"
- Continue → set `$WORKFLOW_NAME`, skip to first pending task or resume intake
- Fresh → `workflow abandon --workflow <name>`, proceed below

### 2. Create Workflow (resolves ALL stages)

```bash
CREATE_JSON=$($DESIGNBOOK_CMD workflow create --workflow <id> --workflow-file <path-to-debo-*.md> [--parent <name>])
WORKFLOW_NAME=$(echo "$CREATE_JSON" | jq -r '.name')
```

The CLI resolves **every stage** at create time — both intake and execution:
- Reads `stages:` from the workflow frontmatter
- For each stage: resolves task_file, rules, config_rules, config_instructions
- Stores everything in `stage_loaded` in tasks.yml
- Outputs JSON with `name` + `stages` + `stage_resolved`

### 3. Load Intake Instructions

```bash
$DESIGNBOOK_CMD workflow instructions --workflow $WORKFLOW_NAME --stage <intake-stage>
```

Returns JSON: `{ task_file, rules, config_rules, config_instructions }`.
Load the `task_file` and all `rules[]` files. Apply `config_rules[]` as constraints.

### 4. Run Intake

Run the workflow body — ask the user questions, collect params.

### 5. Before Hooks

For each `before` entry in workflow frontmatter:
- Check `reads:` gate on the referenced workflow's intake task file — skip if missing
- Apply policy: `always` → run, `if-never-run` → check `workflow list --include-archived`, `ask` → prompt user
- Complete the hook workflow fully before continuing

### 6. Plan (expand items into tasks)

Build items array from intake results: `[{ "stage": "<name>", "params": { ... } }, ...]`. Expand loops (3 components → 3 items).

```bash
$DESIGNBOOK_CMD workflow plan \
  --workflow $WORKFLOW_NAME \
  --params '<global_params_json>' \
  --items '<items_json>'
```

The CLI reads `stage_loaded` from tasks.yml and expands items into tasks: validates params, generates IDs, expands file paths, computes `depends_on`. Outputs the plan as JSON.

Display the plan summary, then proceed immediately to Phase 2.

---

## Phase 2: Execute

The main agent executes all tasks sequentially. For each task:

1. Load instructions: `workflow instructions --workflow $WORKFLOW_NAME --stage <task-stage>`
2. Read task data from tasks.yml: `params`, `files` + top-level `params`
3. Create files following task file instructions + rule constraints
4. Validate: `workflow validate --workflow $WORKFLOW_NAME --task <id>`
5. Mark done: `workflow done --workflow $WORKFLOW_NAME --task <id>`

> Rules are hard constraints — apply silently, never mention to the user.
> `validate` MUST exit 0 before `done`. Never skip validation.

### After Hooks

When the last `workflow done` auto-archives, process `after` entries from workflow frontmatter:
- Prompt: "Run `/<workflow-id>` next?"
- If accepted → start it with `--parent $WORKFLOW_NAME`
