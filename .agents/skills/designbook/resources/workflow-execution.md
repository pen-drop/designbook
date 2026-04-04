---
when: {}
---

# Workflow Execution Rules

## Scope Boundary

> ⛔ **OpenSpec artifacts are out of scope.** During any `debo` workflow, never read, load, or reference OpenSpec specs — change files, delta specs, main specs, or any artifact under `.agents/changes/` or similar OpenSpec paths. Task files, rule files, and blueprint files come exclusively from `.agents/skills/*/tasks/`, `.agents/skills/*/rules/`, and `.agents/skills/*/blueprints/`.

---

## Phase 0: Bootstrap

> Run FIRST — nothing works without it. Bundle ALL CLI calls in one Bash block so bootstrap runs only once.

```bash
# Inline helper — bootstraps on first call, skips if already done
_debo() {
  if [ -z "$DESIGNBOOK_HOME" ]; then
    eval "$(npx storybook-addon-designbook config)"
  fi
  npx storybook-addon-designbook "$@"
}
```

> **Important:** Always use `npx storybook-addon-designbook` for CLI commands. The `DESIGNBOOK_CMD` / `designbook()` shell function from config starts the Storybook dev server — it is **not** the CLI entry point.

> **Bootstrap Scope:** `DESIGNBOOK_*` variables set by `eval "$(npx storybook-addon-designbook config)"` are scoped to the current Bash block only. They are **not** available in subsequent Bash calls. The `_debo()` helper re-bootstraps automatically on first call within each block — use it for all CLI calls. If you need a value like `$DESIGNBOOK_HOME` for path construction, capture it in the same block:
>
> ```bash
> _debo workflow list --workflow design-screen  # first _debo call bootstraps DESIGNBOOK_*
> WF_FILE="$DESIGNBOOK_HOME/.agents/skills/designbook/design/workflows/design-screen.md"  # ✓ set by bootstrap above
> _debo workflow create --workflow design-screen --workflow-file "$WF_FILE"
> ```

All subsequent CLI calls use `_debo <command>` — bootstrap is skipped after the first call. Bundle multiple commands in one Bash block to maximise reuse.

If no config found → stop and ask the user.

---

## Untracked Workflows (`track: false`)

Workflows with `track: false` in frontmatter skip the entire workflow lifecycle (no `workflow create`, no `done`). They are utility commands, not artifact-producing workflows.

**Execution:**
1. Bootstrap (`_debo` helper — same as Phase 0)
2. Load the workflow file and read its instructions
3. Execute the CLI commands directly — no tracking, no tasks.yml

**When to use:** Dev tooling, server management, or any command that doesn't produce designbook artifacts.

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

**Resume path:** when continuing an existing workflow, set `WORKFLOW_NAME=$EXISTING` and skip directly to Step 3 (Load Intake Instructions). Do **not** re-run `workflow create` — it has already been executed and tasks.yml is already populated.

Use the **absolute path** for `--workflow-file`. Workflow files live at `$DESIGNBOOK_HOME/.agents/skills/designbook/<concern>/workflows/<workflow-id>.md` (e.g. `$DESIGNBOOK_HOME/.agents/skills/designbook/vision/workflows/vision.md`).

### 2. Create Workflow (resolves ALL steps)

```bash
CREATE_JSON=$(_debo workflow create --workflow <id> --workflow-file <abs-path-to-workflow.md> [--parent <name>])
WORKFLOW_NAME=$(echo "$CREATE_JSON" | jq -r '.name')
```

The CLI resolves **every step** at create time — including intake:
- Reads `stages:` from the workflow frontmatter (grouped format with optional `each`)
- For each step: resolves task_file, rules, blueprints, config_rules, config_instructions
- The `intake` stage is declared in frontmatter like any other stage — resolved via `intake--<workflow-id>.md` fallback
- Stores everything in `stage_loaded` in tasks.yml
- Outputs JSON with `name` + `steps` + `stages` + `step_resolved` + `expected_params`

### 3. Load Intake Instructions

The `intake` stage is a regular declared stage — load its instructions via CLI:

```bash
_debo workflow instructions --workflow $WORKFLOW_NAME --stage intake
```

Read the `task_file` path from the output to load the actual task content and instructions.

Also load any rules and blueprints referenced by the workflow's `step_resolved` output from the create step. **Blueprints behave identically to rules** — when a task brings blueprints, they are loaded automatically into context. Same mechanism, no special handling.

If the user explicitly requests no confirmation (e.g. "ohne Rücksprache", "just do it"), skip the intake confirmation and proceed directly.

The intake gathers information from the user and produces **iterables** — arrays of items that stages will iterate over (e.g. components to create, scenes to build).

After intake is complete, build the params JSON from intake results and mark the intake task as done. The `--params` flag triggers implicit plan logic — the CLI expands iterables into tasks before marking intake done, preventing premature archival.

The `workflow create` response includes `expected_params` — a map of all params required across all stages, aggregated from task file frontmatter. Use this to map intake results to the correct param names. Each param has `required: boolean` and `from_step: string`. Params with `required: true` MUST be provided; optional params have defaults.

Build iterables from intake results and pass them as named arrays in `--params`:

```bash
_debo workflow done --workflow $WORKFLOW_NAME --task intake \
  --params '<params_json>'
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

Display the plan summary, then proceed immediately to Phase 2.

### 4. Before Hooks

For each `before` entry in workflow frontmatter:
- Check `reads:` gate on the referenced workflow's intake task file — skip if missing
- Apply policy: `always` → run, `if-never-run` → check `workflow list --include-archived`, `ask` → prompt user
- Resolve workflow name to file: `before: workflow: css-generate` → `$DESIGNBOOK_HOME/.agents/skills/designbook/css-generate/workflows/css-generate.md`
- Complete the hook workflow fully before continuing

### Singleton Workflows

Workflows where no stage uses `each` (e.g., `tokens`, `design-guidelines`) have no iterables. Call `workflow done --task intake` without `--params` — the CLI auto-plans with empty params `{}`:

```bash
_debo workflow done --workflow $WORKFLOW_NAME --task intake
```

In singleton workflows, intake results are transported via **conversation context** — the agent carries the gathered information forward to the execute stage. There is no structured param handoff for singleton data.

---

## Phase 2: Execute

The main agent executes all tasks sequentially. For each task:

1. Load instructions: `_debo workflow instructions --workflow $WORKFLOW_NAME --stage <task-step>`
2. Read task data from tasks.yml: `params`, `files` + top-level `params`
3. For each file declared in the task, create the content and write it via CLI:
   ```bash
   cat <<'EOF' | _debo workflow write-file $WORKFLOW_NAME <task-id> --key <key>
   <file content>
   EOF
   ```
   The CLI writes the file (engine decides where), validates it immediately, and returns JSON: `{ "valid": true|false, "errors": [...], "file_path": "..." }`
4. If `valid: false` → fix the content and call `write-file` again until all files are green
5. **Verify against intake** — after all files for the task pass validation, compare key output values against what was confirmed during intake. If any user-confirmed value diverges (e.g., a color, font, or dimension shown in the intake summary differs from the written output), fix the content and re-run `write-file`. Only values explicitly presented to and approved by the user during intake are in scope — internally derived values are not checked.
6. Mark task done: `_debo workflow done --workflow $WORKFLOW_NAME --task <id>`

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
| `intake` | Gather user input, produce iterables | — |
| `component` | Create components | `component` |
| `scene` | Create scenes | `scene` |
| `execute` | Singleton work (no iteration) | — |
| `transform` | Transform/generate (no iteration) | — |
| `test` | Visual testing (screenshot, compare, polish) | `scene` or `component` |
| `preview` | Manual review (Storybook preview, user approval) | — |

Implicit stages (`committed`, `finalizing`) are managed by the engine and not declared in frontmatter.

### Merge Flow (git-worktree engine)

When all tasks are done and the engine is `git-worktree`, the `finalizing → done` transition requires a `merge_approved` param. The response will contain `waiting_for` with a merge prompt. Ask the user, then call `_debo workflow merge --workflow $WORKFLOW_NAME`.

For `direct` engine workflows, `finalizing → done` happens automatically (auto-archive).

### After Hooks

When the last `workflow done` auto-archives, process `after` entries from workflow frontmatter:
- Prompt: "Run `/<workflow-id>` next?"
- If accepted → start it with `--parent $WORKFLOW_NAME`

### Optimize Pass (`--optimize`)

Runs **after** after-hooks, only when the `--optimize` flag was set at invocation.

1. Collect all files written during the workflow (from `write-file` results and tasks.yml `files`)
2. Read each file and review for:
   - **Performance** — unnecessary DOM nesting, unoptimized selectors, redundant CSS
   - **Maintainability** — magic values, missing token references, duplicated logic
   - **Accessibility** — missing ARIA attributes, contrast issues, semantic HTML
   - **Design-system consistency** — deviations from tokens, guidelines, or conventions
3. Output a numbered list of concrete suggestions:
   ```
   Optimierungsvorschläge:
   1. [file:line] — Beschreibung + konkreter Fix
   2. …
   ```
4. Do **not** apply changes automatically — only suggest. The user decides which to accept.

### Research Pass (`--research`, internal)

Runs **after** optimize pass (if both set), only when the `--research` flag was set at invocation. This is an internal diagnostic for skill development — it audits the skill execution, not the user's artifacts.

1. **Collect execution trace** — replay the conversation and log every:
   - CLI command that failed (non-zero exit, error messages)
   - Retry or fallback that was needed (e.g. wrong stage name, missing param)
   - Ambiguity where the agent had to guess or try multiple approaches
   - Undocumented behavior (CLI did something not described in skill files)
2. **Root-cause each issue** — for every friction point, identify the source:
   - `workflow-execution.md` — missing/wrong instruction
   - `SKILL.md` — dispatch logic gap
   - `cli-reference.md` — undocumented command or option
   - Task/rule file — missing param, wrong format, unclear instruction
   - CLI bug — the tool itself behaved unexpectedly
3. **Output diagnostic report:**
   ```
   Skill-Diagnose:
   1. [source-file:section] — Was passiert ist → Ursache → Konkreter Fix
   2. …

   Statistik: N Fehler, M Retries, K Ambiguitäten
   ```
4. Do **not** modify skill files automatically — only report. The developer decides which fixes to apply.
