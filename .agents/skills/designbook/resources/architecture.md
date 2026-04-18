# Workflow Architecture

## Unified Extension Model

Every artifact (task, rule, blueprint) has a namespaced `name` in frontmatter:

```yaml
name: <skill>:<concern>:<artifact>
# Examples:
# designbook:design:screenshot        (nested skill)
# designbook-stitch:stitch-inspect    (flat skill)
```

If `name` is omitted, it's derived from the filesystem path. Three optional fields control extensibility:

- **`name`** — unique identity, convention `<skill>:<concern>:<artifact>`
- **`as`** — overrides the named artifact (highest `priority` wins)
- **`priority`** — integer (default 0), determines execution order and override winner

**Override rules:**
- No `as` = additive (runs alongside others)
- With `as` = override (replaces the named artifact if priority is higher)
- Equal priority tiebreak: alphabetically last skill wins

**Short-name resolution:** Within the same skill, the skill prefix can be omitted in `as`. Cross-skill overrides require the full name.

## Stage-Based Architecture

Workflows declare `stages:` in their frontmatter. Each stage groups one or more steps that map to task files in `.agents/skills/*/tasks/<step>.md`. Rule files at `.agents/skills/*/rules/<name>.md` apply contextual constraints. Blueprint files at `.agents/skills/*/blueprints/<name>.md` provide starting points for component creation.

```yaml
# workflow frontmatter
stages:
  intake:
    steps: [intake]
  component:
    steps: [create-component]
```

### Workflow Params and Resolvers

Workflows declare `params:` in frontmatter. Params with a `resolve:` field are automatically resolved by the CLI at `workflow create` time using registered code resolvers:

```yaml
params:
  story_id:
    type: string
    resolve: story_id           # resolved by story_id resolver
  reference_folder:
    type: string
    resolve: reference_folder   # resolved by reference_folder resolver
    from: reference_url         # depends on another param
  breakpoints:
    type: string
    resolve: breakpoints        # resolved by breakpoints resolver
```

- `resolve: <name>` — names a registered resolver (code, not AI-executed)
- `from: <param>` — declares a dependency on another param (resolved after independent params)
- Resolvers run deterministically at `workflow create` time
- If a resolver can't resolve (ambiguous input), it returns `candidates` for the AI to present to the user (see Step 0.5 in workflow-execution)
- Params without `resolve:` are passed through as-is from `--params`

**Available resolvers:** `story_id`, `reference_folder`, `breakpoints`

This replaces the older "provider rules" pattern (`provides: <param>` on rule files). Provider rules were AI-executed; resolvers are deterministic code. Some provider rules may still exist during migration but new param resolution should use code resolvers.

Tasks declare their iteration requirements via `each:` in their own frontmatter (not in the workflow stage definition). Every `each:` names one or more **bindings**; the value is a JSONata expression evaluated against task scope. Each array item is bound under the binding name, and one task instance is expanded per item.

```yaml
# task frontmatter (create-component.md)
each:
  component:
    expr: "components"
    schema: { $ref: ../schemas.yml#/Component }
result:
  component-yml:
    path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component.component }}/{{ component.component }}.component.yml
    validators: [data]
```

The engine evaluates the expression, binds every array item under `component`, and expands one task per item. Scope is populated when the preceding stage completes and its data results are collected.

**Dependent axes** — inner bindings can reference previously bound axes. The expression evaluates lazily against the scope enriched with earlier bindings, so `component.variants` resolves to the variants of the *current* component item:

```yaml
# task frontmatter (create-variant-story.md)
each:
  component:
    expr: "components"
    schema: { $ref: ../schemas.yml#/Component }
  variant:
    expr: "component.variants"
    schema: { $ref: ../schemas.yml#/Variant }
result:
  variant-story:
    path: ${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.{{ variant.id }}.story.yml
```

Multiple independent bindings produce the cross-product. JSONata filters (`component.variants[published=true]`) and array functions are available inside the expression. See `designbook-skill-creator/resources/schemas.md#each-iteration-declaration` for the full rules.

The `intake` stage is a regular declared stage — its task file is resolved via the `intake--<workflow-id>.md` fallback convention. It runs first, gathering user input and producing data results that flow into scope for subsequent stages.

## CLI-Side Resolution

The `workflow plan` CLI (resolution mode) replaces AI-side task resolution:

```
AI builds items array → CLI resolves:
  ├─ task files (scan + when-filter + name/as dedup + priority sort)
  ├─ multiple tasks per step (ordered by priority, lowest first)
  ├─ WORKTREE creation ($DESIGNBOOK_WORKSPACES/designbook-{name}/)
  ├─ result path expansion — result: entries with path: use WORKTREE-remapped DESIGNBOOK_DIRS_* vars
  ├─ $ref resolution — all schema references inlined from schemas.yml files
  ├─ each: extraction from task frontmatter (scope key + schema)
  ├─ reads: use real DESIGNBOOK_HOME paths (not remapped)
  ├─ params validation (required/optional/defaults)
  ├─ depends_on computation (from stage ordering)
  ├─ rule file matching (stages + config conditions)
  ├─ blueprint file matching (stages + config conditions)
  └─ config rules/instructions per stage
→ writes tasks.yml with fully-resolved paths + write_root/root_dir + scope
→ outputs JSON plan to stdout
```

**Multi-task resolution per step:** When multiple tasks match a step, they are deduplicated by `name`/`as` and sorted by `priority`. Tasks without `as` are additive; tasks with `as` override the named artifact. Within each step, tasks execute sequentially (lowest priority first).

## WORKTREE Lifecycle

Each `workflow plan` creates an isolated write workspace under `$DESIGNBOOK_WORKSPACES/designbook-{workflow-name}/` (default: `/tmp`). Storybook never observes partial writes.

```
workflow plan
  → create /tmp/designbook-{name}/             ← WORKTREE
  → remap DESIGNBOOK_DIRS_* → WORKTREE paths
  → expand result: path entries with remapped env → stored as WORKTREE absolute paths
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
- Reads its task from tasks.yml (task_file, params, rules, result declarations)
- Reads rule files directly (no scanning)
- Writes results → validate → fix loop → done

## Task File Format (skills)

Task files live at `.agents/skills/<skill-name>/tasks/<stage-name>.md`. The filename is the canonical stage name:

```markdown
---
trigger:
  steps: [create-component]  # activate the task when this step runs
filter:
  frameworks.component: sdc  # only when the project uses this framework
params:
  component: ~               # ~ means required (from intake)
each:
  component:
    expr: "components"
    schema: { $ref: ../schemas.yml#/Component }
result:
  component-yml:
    path: ${DESIGNBOOK_DIRS_COMPONENTS}/{{ component.component }}/{{ component.component }}.component.yml
    validators: [data]
  component-twig:
    path: ${DESIGNBOOK_DIRS_COMPONENTS}/{{ component.component }}/{{ component.component }}.twig
---
# Task instructions go here
```

- `trigger` declares WHEN the task activates. Keys `steps` and `domain` are OR-connected — at least one must match.
- `filter` declares WHERE the task applies. Keys (`backend`, `frameworks.*`, `extensions`, `type`) are AND-connected — every key must match.
- `each` declares iteration: keys are binding names, values are JSONata expressions evaluated against task scope (short form: string; long form: `{ expr, schema }`). Inner bindings can reference earlier ones for dependent axes. Helpers `$i` and `$total` are exposed inside each expanded task.
- `result` declares task outputs: file results (with `path:`) and data results (inline schema or `$ref`). Paths are always absolute — using env vars with `{{ param }}` substitution (resolved by CLI at plan time)
- A task file with no `trigger:` and no `filter:` never matches

**`filter` condition keys:**
- `frameworks.component` → `$DESIGNBOOK_FRAMEWORK_COMPONENT`
- `backend` → `$DESIGNBOOK_BACKEND`
- `frameworks.css` → `$DESIGNBOOK_FRAMEWORK_CSS`
- `extensions` → checks if value is present in `$DESIGNBOOK_EXTENSIONS` (comma-separated list). E.g. `filter: extensions: canvas` matches when `canvas` is in the active extensions list.

## Rule File Format (skills)

Rule files live at `.agents/skills/<skill-name>/rules/<name>.md`. They define constraints scoped to knowledge domains:

```markdown
---
trigger:
  domain: components           # activate when current step touches this domain
filter:
  frameworks.component: sdc    # optional config condition
---
# Rule constraints go here (prose — never execution steps)
```

- `trigger.domain:` matches against the effective domains of the current step (union of task + stage domains). OR-connected with `trigger.steps:`.
- `trigger.steps:` activates the rule when the given step name runs. OR-connected with `trigger.domain:`.
- `filter:` keys (`backend`, `frameworks.*`, `extensions`, `type`) further restrict applicability — all must match (AND).
- Without any `trigger:` key a rule never matches.

## Blueprint File Format (skills)

Blueprint files live at `.agents/skills/<skill-name>/blueprints/<name>.md`. They provide starting points for component creation — required tokens, props, slots, and markup guidance. Blueprints use the same `domain:` frontmatter matching as rules:

```yaml
---
type: component          # blueprint type (currently: component)
name: section            # unique name within the type
trigger:
  domain: components.layout
priority: 10             # higher wins (default: 0)
---
```

**Uniqueness rule:** Only one blueprint per `type`+`name` combination is active. When multiple skills define the same blueprint, the one with the highest `priority` wins. If priorities are equal, the last match wins (skills are globbed alphabetically). Convention: base = 0, integration = 10, project = 20. This allows integrations and projects to explicitly override base blueprints.

**Unlike rules:** Rules are additive (all matching rules are loaded). Blueprints are unique per type+name — only one is active.

```markdown
---
type: component
name: section
trigger:
  domain: components.layout
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
- Same `trigger:` / `filter:` semantics as rules
- Deduplicated by `type`+`name` — highest `priority` wins (equal priority: last match wins)

## Domain-Based Matching (Rules & Blueprints)

Rules and blueprints use `trigger.domain:` for step matching.

### Declaration

**On rules/blueprints (supply side):**
```yaml
trigger:
  domain: scenes
filter:
  backend: drupal
```

**On tasks (demand side):**
```yaml
trigger:
  domain: [components, scenes]
```

**On workflow stages (additive):**
```yaml
stages:
  scene:
    steps: [create-scene]
    domain: [data-model]
```

### Subcontexts

Domains use dot-notation for hierarchy: `components.layout`, `scenes.shell`.

Matching: a match occurs when one is a dot-delimited prefix of the other, or they are equal.
- `components` in task → loads rules with `components` and `components.*`
- `components.layout` in task → loads rules with `components` (parent) and `components.layout` (exact)

### Domain Taxonomy

| Domain | Subcontexts | Description |
|---|---|---|
| `components` | `.layout`, `.discovery`, `.shell` | Component structure and conventions |
| `scenes` | `.shell`, `.screen` | Scene file authoring constraints |
| `data-model` | — | Entity types, field conventions |
| `data-mapping` | — | Entity-to-component mapping |
| `tokens` | — | Design token structure |
| `sample-data` | — | Sample data generation |
| `css` | — | CSS generation, fonts |
| `design` | `.intake`, `.verify` | Design workflow rules |

### Legacy

`when.steps` in rules/blueprints is deprecated but still supported. New rules must use `domain:`. Task files keep `when.steps` permanently for task resolution.

