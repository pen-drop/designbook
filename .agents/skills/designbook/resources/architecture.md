# Workflow Architecture

## Stage-Based Architecture

Workflows declare a `steps:` array in their frontmatter. Each non-intake step maps to task files discovered in `.agents/skills/*/tasks/<step>.md`. Rule files at `.agents/skills/*/rules/<name>.md` apply contextual constraints. Blueprint files at `.agents/skills/*/blueprints/<name>.md` provide starting points for component creation.

```yaml
# workflow frontmatter
workflow:
  title: Design Shell
  steps: [intake, create-component, create-shell-scene]
```

The `intake` stage is the workflow body itself (interviews the user). All other stages are executed via skill task files.

**Named intake stages**: use `workflow-id:intake` (e.g. `debo-design-tokens:intake`) when rules should apply specifically to one workflow's intake without affecting other workflows.

## CLI-Side Resolution

The `workflow plan` CLI (resolution mode) replaces AI-side task resolution:

```
AI builds items array → CLI resolves:
  ├─ task files (scan + when-filter + precedence)
  ├─ WORKTREE creation ($DESIGNBOOK_WORKSPACES/designbook-{name}/)
  ├─ file path expansion — files: use WORKTREE-remapped DESIGNBOOK_DIRS_* vars
  ├─ reads: use real DESIGNBOOK_HOME paths (not remapped)
  ├─ params validation (required/optional/defaults)
  ├─ depends_on computation (from stage ordering)
  ├─ rule file matching (stages + config conditions)
  ├─ blueprint file matching (stages + config conditions)
  └─ config rules/instructions per stage
→ writes tasks.yml with fully-resolved paths + write_root/root_dir
→ outputs JSON plan to stdout
```

## WORKTREE Lifecycle

Each `workflow plan` creates an isolated write workspace under `$DESIGNBOOK_WORKSPACES/designbook-{workflow-name}/` (default: `/tmp`). Storybook never observes partial writes.

```
workflow plan
  → create /tmp/designbook-{name}/             ← WORKTREE
  → remap DESIGNBOOK_DIRS_* → WORKTREE paths
  → expand files: with remapped env → stored as WORKTREE absolute paths
  → store write_root + root_dir in tasks.yml

workflow done (each task)
  → no file copy, no touch — Storybook sees nothing

workflow done (final task, allDone=true)
  → cp -r WORKTREE/* DESIGNBOOK_HOME/          ← atomic commit
  → touch all copied files                     ← Storybook HMR trigger
  → rm -rf WORKTREE                            ← cleanup
```

**Key variables:**
- `DESIGNBOOK_HOME` — always the real config dir; used for `reads:` (never remapped)
- `DESIGNBOOK_DIRS_CONFIG` — remapped to `WORKTREE/...` during workflow; real path outside workflow
- `DESIGNBOOK_DIRS_COMPONENTS` — same remapping pattern
- `DESIGNBOOK_WORKSPACES` — base directory for WORKTREE (default: `/tmp`)

**`outputs` in designbook.config.yml:**
```yaml
dirs:
  config: packages/integrations/test-integration-drupal/designbook    # → DESIGNBOOK_DIRS_CONFIG
  components: packages/integrations/test-integration-drupal/components # → DESIGNBOOK_DIRS_COMPONENTS
  css: packages/integrations/test-integration-drupal/css/tokens        # → DESIGNBOOK_DIRS_CSS
```

Only `DESIGNBOOK_DIRS_*`, `DESIGNBOOK_HOME`, and `DESIGNBOOK_DATA` are remapped to WORKTREE at plan time. All other vars remain as real paths.

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
  - ${DESIGNBOOK_DIRS_COMPONENTS}/{{ component }}/{{ component }}.component.yml
  - ${DESIGNBOOK_DIRS_COMPONENTS}/{{ component }}/{{ component }}.twig
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
  steps: [create-component, create-shell-scene]   # one or more canonical stages
  frameworks.component: sdc                         # optional additional condition
---
# Rule constraints go here (prose — never execution steps)
```

- `steps:` accepts a single value or an array
- Without `when.steps`: rule applies to all steps
- **Named intake stages**: use `workflow-id:intake` to scope a rule to a specific workflow's intake

## Blueprint File Format (skills)

Blueprint files live at `.agents/skills/<skill-name>/blueprints/<name>.md`. They provide starting points for component creation — required tokens, props, slots, and markup guidance. Blueprints use the same `when` frontmatter matching as rules:

```yaml
---
type: component          # blueprint type (currently: component)
name: section            # unique name within the type
priority: 10             # higher wins (default: 0)
when:
  steps: [create-component]
---
```

**Uniqueness rule:** Only one blueprint per `type`+`name` combination is active. When multiple skills define the same blueprint, the one with the highest `priority` wins. If priorities are equal, the last match wins (skills are globbed alphabetically). Convention: base = 0, integration = 10, project = 20. This allows integrations and projects to explicitly override base blueprints.

**Unlike rules:** Rules are additive (all matching rules are loaded). Blueprints are unique per type+name — only one is active.

```markdown
---
type: component
name: section
when:
  steps: [create-component]
---
# Blueprint: Section

## When to use
Use when building a component that wraps content in a vertical section.

## Required Tokens
section:
  padding-y:
    sm: { $value: "2rem", $type: "dimension" }

## Props
- background: string (optional)

## Slots
- content (required)

## Markup Guidance
- Outer wrapper with vertical padding from section tokens
```

- Blueprints say "what to build" (starting points); rules say "how to build" (constraints)
- Loaded alongside rules via `skills/**/blueprints/*.md` glob
- Same `when` conditions as rules (`steps`, config keys)
- Deduplicated by `type`+`name` — highest `priority` wins (equal priority: last match wins)

