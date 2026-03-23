# Workflow Architecture

## Stage-Based Architecture

Workflows declare a `stages:` array in their frontmatter. Each non-intake stage maps to task files discovered in `.agents/skills/*/tasks/<stage>.md`. Rule files at `.agents/skills/*/rules/<name>.md` apply contextual constraints.

```yaml
# workflow frontmatter
workflow:
  title: Design Shell
  stages: [intake, create-component, create-shell-scene]
```

The `intake` stage is the workflow body itself (interviews the user). All other stages are executed via skill task files.

**Named intake stages**: use `workflow-id:intake` (e.g. `debo-design-tokens:intake`) when rules should apply specifically to one workflow's intake without affecting other workflows.

## CLI-Side Resolution

The `workflow plan` CLI (resolution mode) replaces AI-side task resolution:

```
AI builds items array → CLI resolves:
  ├─ task files (scan + when-filter + precedence)
  ├─ file path expansion ({{ param }} + ${ENV_VAR})
  ├─ params validation (required/optional/defaults)
  ├─ depends_on computation (from stage ordering)
  ├─ rule file matching (stages + config conditions)
  └─ config rules/instructions per stage
→ writes tasks.yml with fully-resolved data
→ outputs JSON plan to stdout
```

## DAG Orchestration Pattern

After planning, the main agent becomes a DAG orchestrator:

```
1. Compute ready tasks (deps all done)
2. Spawn Agent per ready task (parallel)
3. Wait for wave to complete
4. Print "Wave N complete: X/Y tasks done"
5. Repeat until all done or deadlock
```

Each subagent executes in isolation:
- Reads its task from tasks.yml (task_file, params, rules, files)
- Reads rule files directly (no scanning)
- Creates files → validate → fix loop → done

## Task File Format (skills)

Task files live at `.agents/skills/<skill-name>/tasks/<stage-name>.md`. The filename is the canonical stage name:

```markdown
---
when:
  frameworks.component: sdc   # optional — filter condition
params:
  component: ~               # ~ means required (from intake)
  slots: []
files:
  - ${DESIGNBOOK_DRUPAL_THEME}/components/{{ component }}/{{ component }}.component.yml
  - ${DESIGNBOOK_DRUPAL_THEME}/components/{{ component }}/{{ component }}.twig
---
# Task instructions go here
```

- `when` conditions filter which task file applies
- `files` paths are always absolute — using env vars with `{{ param }}` substitution (resolved by CLI at plan time)
- A task file with no `when` block applies universally

**`when` condition keys:**
- `frameworks.component` → `$DESIGNBOOK_FRAMEWORK_COMPONENT`
- `backend` → `$DESIGNBOOK_BACKEND`
- `frameworks.css` → `$DESIGNBOOK_FRAMEWORK_CSS`

## Rule File Format (skills)

Rule files live at `.agents/skills/<skill-name>/rules/<name>.md`. They define constraints scoped to one or more stages:

```markdown
---
when:
  stages: [create-component, create-shell-scene]   # one or more canonical stages
  frameworks.component: sdc                         # optional additional condition
---
# Rule constraints go here (prose — never execution steps)
```

- `stages:` accepts a single value or an array
- Without `when.stages`: rule applies to all stages
- **Named intake stages**: use `workflow-id:intake` to scope a rule to a specific workflow's intake

