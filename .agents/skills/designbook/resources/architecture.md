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
  ├─ WORKTREE creation ($DESIGNBOOK_WORKSPACES/designbook-{name}/)
  ├─ file path expansion — files: use WORKTREE-remapped DESIGNBOOK_OUTPUTS_* vars
  ├─ reads: use real DESIGNBOOK_ROOT paths (not remapped)
  ├─ params validation (required/optional/defaults)
  ├─ depends_on computation (from stage ordering)
  ├─ rule file matching (stages + config conditions)
  └─ config rules/instructions per stage
→ writes tasks.yml with fully-resolved paths + write_root/root_dir
→ outputs JSON plan to stdout
```

## WORKTREE Lifecycle

Each `workflow plan` creates an isolated write workspace under `$DESIGNBOOK_WORKSPACES/designbook-{workflow-name}/` (default: `/tmp`). Storybook never observes partial writes.

```
workflow plan
  → create /tmp/designbook-{name}/             ← WORKTREE
  → remap DESIGNBOOK_OUTPUTS_* → WORKTREE paths
  → expand files: with remapped env → stored as WORKTREE absolute paths
  → store write_root + root_dir in tasks.yml

workflow done (each task)
  → no file copy, no touch — Storybook sees nothing

workflow done (final task, allDone=true)
  → cp -r WORKTREE/* DESIGNBOOK_ROOT/          ← atomic commit
  → touch all copied files                     ← Storybook HMR trigger
  → rm -rf WORKTREE                            ← cleanup
```

**Key variables:**
- `DESIGNBOOK_ROOT` — always the real config dir; used for `reads:` (never remapped)
- `DESIGNBOOK_OUTPUTS_CONFIG` — remapped to `WORKTREE/...` during workflow; real path outside workflow
- `DESIGNBOOK_OUTPUTS_COMPONENTS` — same remapping pattern
- `DESIGNBOOK_WORKSPACES` — base directory for WORKTREE (default: `/tmp`)

**`outputs` in designbook.config.yml:**
```yaml
outputs:
  config: packages/integrations/test-integration-drupal/designbook    # → DESIGNBOOK_OUTPUTS_CONFIG
  components: packages/integrations/test-integration-drupal/components # → DESIGNBOOK_OUTPUTS_COMPONENTS
  css: packages/integrations/test-integration-drupal/css/tokens        # → DESIGNBOOK_OUTPUTS_CSS
```

Only `DESIGNBOOK_OUTPUTS_*` vars are remapped to WORKTREE at plan time. All other vars remain as real paths.

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
  - ${DESIGNBOOK_OUTPUTS_COMPONENTS}/{{ component }}/{{ component }}.component.yml
  - ${DESIGNBOOK_OUTPUTS_COMPONENTS}/{{ component }}/{{ component }}.twig
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
- `extensions` → checks if value is present in `$DESIGNBOOK_EXTENSIONS` (comma-separated list). E.g. `when: extensions: canvas` matches when `canvas` is in the active extensions list.

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

