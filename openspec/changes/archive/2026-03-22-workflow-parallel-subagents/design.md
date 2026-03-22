## Context

Currently debo-* workflows run all stages sequentially in a single AI session. Rule 3 Phase 2 is essentially a build system — the AI scans skill directories, filters task files by `when` conditions, reads frontmatter, expands file path templates, builds JSON arrays — and passes the result to `workflow plan` CLI which just stores it. This is deterministic work that belongs in code, not in an LLM.

Moving resolution to the CLI enables isolated subagents: the CLI resolves everything at plan time, so each subagent receives a fully self-contained task with `task_file`, `params`, `rules`, `files`, `depends_on` — no skill scanning needed.

## Goals / Non-Goals

**Goals:**
- `workflow plan` CLI resolves task files, expands paths, computes dependencies, matches rules
- Intake context survives into subagents via `params` in tasks.yml (global + per-task)
- Tasks with no unmet dependencies execute in parallel via Agent tool
- Stage ordering is encoded through `depends_on` edges (computed by CLI from stage order)
- File locking on tasks.yml for concurrent subagent writes
- Workflow YAML format (`debo-*.md`) unchanged

**Non-Goals:**
- Resuming partially-executed parallel runs (existing resume logic handles this)
- Distributing subagents across machines
- Retry logic beyond the existing validate loop
- Moving intake conversation to CLI

## Decisions

### D1: New `workflow plan` interface

**Current:**
```bash
$DESIGNBOOK_CMD workflow plan \
  --workflow $WORKFLOW_NAME \
  --stages '<stages_json>' \
  --tasks '<tasks_json>'     # AI pre-builds the entire tasks array
```

**New:**
```bash
$DESIGNBOOK_CMD workflow plan \
  --workflow $WORKFLOW_NAME \
  --workflow-file .agents/workflows/debo-design-screen.md \
  --params '{"section_id": "dashboard"}' \
  --items '[
    {"stage": "create-component", "params": {"component": "button", "slots": ["icon"]}},
    {"stage": "create-component", "params": {"component": "card", "slots": ["header","body"]}},
    {"stage": "create-sample-data", "params": {"section_id": "dashboard"}},
    {"stage": "map-entity", "params": {"entity_type": "node", "bundle": "article"}},
    {"stage": "create-section-scene", "params": {"section_id": "dashboard"}}
  ]'
```

The AI only decides **which items to create** (loop expansion from intake). The CLI does everything else:

1. Read `--workflow-file` frontmatter → get `stages:` array (skip `:intake` stages)
2. For each item: resolve task file via stage name (scan `.agents/skills/*/tasks/<stage>.md`, apply `when`-filter, precedence)
3. Read task file frontmatter → expand `files:` templates with item params + global params + env vars
4. Generate task ID from stage + item params (e.g. `create-component-button`)
5. Generate task title from stage + key param
6. Compute `depends_on`: all tasks of stage N depend on all task IDs of stage N-1
7. Match rule files per stage (scan `.agents/skills/*/rules/*.md`, filter `when.stages` + config conditions)
8. Write tasks.yml with fully-resolved data
9. Output plan as JSON to stdout

**Alternative considered:** keep AI-side resolution, just add `depends_on`. Rejected — the resolution is deterministic work that the AI does unreliably and wastes context.

### D2: Items are explicit — no auto-generation

Every non-intake stage needs at least one item in `--items`. The CLI does NOT auto-generate tasks for stages not mentioned — that would require the CLI to know intake results.

The AI's only job after intake: build the items array (one entry per task, with stage + params).

**Alternative considered:** CLI auto-generates one task per stage not in items. Rejected — params are stage-specific and the CLI can't guess them.

### D3: Per-task params + global params

```yaml
# tasks.yml
params:                           # global (from --params)
  section_id: dashboard

tasks:
  - id: create-component-button
    stage: create-component
    params:                       # per-task (from --items[].params)
      component: button
      slots: [icon, label]
    task_file: /abs/path/.agents/skills/designbook-components-sdc/tasks/create-component.md
    rules:
      - /abs/path/.agents/skills/designbook-css-daisyui/rules/daisyui-naming.md
    depends_on: []
    files:
      - path: /abs/path/components/button/button.component.yml
      - path: /abs/path/components/button/button.twig
```

Subagent reads: its own `params` for task-specific context, plus top-level `params` for global context (section name, etc.).

### D4: depends_on computed from stage ordering

The CLI reads the stages array and assigns dependencies:
- Stage 0 tasks: `depends_on: []`
- Stage 1 tasks: `depends_on: [all stage-0 task IDs]`
- Stage N tasks: `depends_on: [all stage-N-1 task IDs]`

This is coarser than a hand-tuned DAG but correct and automatic. Intra-stage parallelism is always enabled (all tasks within the same stage have the same deps and run in parallel).

**Alternative considered:** AI manually sets depends_on. Rejected — error-prone and the stage ordering already encodes the dependency graph.

### D5: Rule files + config rules/instructions pre-resolved at plan time

The CLI resolves three sources of constraints per task:

1. **Rule files**: scans `.agents/skills/*/rules/*.md` frontmatter, matches by `when.stages` + config conditions → stores paths in `task.rules[]`
2. **Config rules**: reads `designbook.config.yml` → `workflow.rules.<stage>` → stores strings in `task.config_rules[]`
3. **Config instructions**: reads `designbook.config.yml` → `workflow.tasks.<stage>` → stores strings in `task.config_instructions[]`

```yaml
tasks:
  - id: create-component-button
    rules:
      - /abs/.agents/skills/designbook-css-daisyui/rules/daisyui-naming.md
    config_rules:
      - "Komponenten-Namen immer auf Englisch, kebab-case"
    config_instructions:
      - "Nach Erstellung prüfen ob die Komponente im Storybook ohne Fehler rendert"
```

Subagents read rule files directly and apply config strings as constraints/instructions — no Rule 5b scanning needed, no config file reading needed.

### D6: File locking for concurrent access

Multiple subagents call `workflow validate` and `workflow done` in parallel, each doing read-modify-write on tasks.yml. Without locking, last-write-wins race condition.

**Solution:** use `proper-lockfile` npm package (or manual `.lock` file with retry). Lock is acquired before read, released after write, for every R-M-W operation in `workflowValidate` and `workflowDone`.

### D7: Subagent contract

Each subagent receives a prompt containing:
- Workflow name (`$WORKFLOW_NAME`)
- Task ID
- Path to tasks.yml

The subagent:
1. Reads tasks.yml → finds its task → reads `task_file`, `params`, `rules`, `files`
2. Reads top-level `params` for global context
3. Rule 0: load config (for env vars needed by file creation)
4. Reads `task.rules[]` files (replaces Rule 5b scan)
5. Rule 5a: checks `reads:` from task file frontmatter
6. Reads task file instructions
7. Creates files following instructions + params + rules
8. Runs `workflow validate --workflow $WORKFLOW_NAME --task <id>`
9. Fix loop until exit 0
10. Runs `workflow done --workflow $WORKFLOW_NAME --task <id> --loaded '<json>'`

### D8: Main agent is the DAG orchestrator

After `workflow plan`, the main agent enters the DAG loop:
1. Display plan summary
2. Compute `ready = tasks where all depends_on are done`
3. Spawn `Agent(task)` for every ready task in parallel
4. Wait for all to complete
5. Print "Wave N complete: X/Y tasks"
6. Repeat from step 2
7. Rule 7: auto-archive on last done

No wave-level pause. User can Ctrl+C at any time.

## Risks / Trade-offs

- **Lock contention**: many parallel subagents → lock contention on tasks.yml. Mitigation: each subagent only locks twice (validate + done), and the lock is held briefly (YAML read/write). At 5-10 parallel tasks, this is negligible.
- **Orphaned subagents on Ctrl+C**: subagents in-flight may complete and write files. Acceptable — partial progress is valid, resume handles it.
- **CLI complexity increase**: `workflow plan` goes from a simple store to a resolution engine. Mitigation: resolution logic is well-defined (scan + filter + expand), and it's testable.
- **Intake params completeness**: if AI doesn't pass all required params, CLI can validate against task file's `params:` schema and error early.

## Open Questions

- Should `params` be validated against the task file's frontmatter `params:` schema at plan time? → Yes, error early.
- Should the CLI output include the matched rule files content (not just paths)? → No, subagents read them. Paths are sufficient.
