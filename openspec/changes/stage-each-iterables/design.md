## Context

The designbook workflow system uses a stage-based architecture where workflows declare stages (execute, test, preview) with steps. Currently, the agent manually constructs `--items` arrays for `workflow plan`, specifying one item per step per entity (component, scene). Test-stage steps are routinely forgotten, causing silent skipping.

Current flow:
1. Intake runs (as a step inside execute stage)
2. Agent builds items array manually: `[{step: "create-component", params: {component: "header"}}, ...]`
3. Agent calls `workflow plan --items '<json>'`
4. CLI expands items into tasks

New flow:
1. Intake runs automatically (engine convention)
2. Agent calls `workflow plan --params '{"component": [...], "scene": [...]}'`
3. CLI reads `each` from stage definitions and auto-expands all steps × iterables into tasks

## Goals / Non-Goals

**Goals:**
- Eliminate manual `--items` construction — agent only provides iterables from intake
- Ensure test-stage tasks are always created when the stage is declared
- Make intake an implicit engine step, not a declared stage step
- Keep backward compatibility for workflows without `each` (singleton stages)

**Non-Goals:**
- Changing the task execution model (still sequential per task)
- Adding cross-stage dependencies (test tasks depend on execute completion by stage order, not explicit deps)
- Removing `workflow plan` command — it stays, just gets simpler input

## Decisions

### 1. `each` on stage level, not step level

Stage-level `each` means all steps in a stage share the same iterable. This covers all current cases (test stage = all steps per scene) and avoids per-step repetition.

```yaml
stages:
  component:
    each: component
    steps: [create-component]
  test:
    each: scene
    steps: [screenshot, resolve-reference, visual-compare, polish]
```

**Alternative considered:** Step-level `each` — more flexible but adds complexity for no current benefit. Every test step iterates over the same iterable.

### 2. Intake as engine convention

Intake is removed from `stages.execute.steps` and becomes implicit. The engine always resolves and runs the intake task file first (by convention: `intake--<workflow-id>.md`).

**Rationale:** Intake always runs exactly once, never needs `each`, and must complete before plan. It's not a "stage" — it's a prerequisite.

### 3. `--params` replaces `--items`

The `workflow plan` command accepts `--params` with named iterable arrays instead of `--items` with explicit step assignments:

```bash
# Before
workflow plan --items '[{"step":"create-component","params":{"component":"header"}}, ...]'

# After
workflow plan --params '{"component":[{"component":"header","group":"Shell"}], "scene":[{"scene":"design-system:shell"}]}'
```

The CLI matches iterable names to `each` declarations in stage definitions.

**Stages without `each`** get a single implicit task per step (singleton expansion).

### 4. Iterable param injection

When expanding `each: scene` with iterable `[{"scene":"design-system:shell"}]`, the CLI merges each iterable object into the task's `params`. The task's frontmatter `params.scene: ~` receives the value `"design-system:shell"`.

### 5. Workflow frontmatter migration

All workflows restructured. Example design-shell before/after:

```yaml
# Before
stages:
  execute:
    steps: [intake, create-component, create-scene]
  test:
    steps: [screenshot, resolve-reference, visual-compare, polish]

# After
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

## Risks / Trade-offs

- **BREAKING: `--items` removal** → All agent code that constructs items must be updated. Mitigated by updating `workflow-execution.md` which is the single source of truth for agent behavior.
- **Stage naming becomes semantic** → Stage names like `component` and `scene` now carry meaning (they're iterable names). This is a feature, not a bug — it makes workflows self-documenting.
- **Singleton stages** → Workflows without iteration (vision, data-model, tokens) need stages without `each`. These get one implicit task per step, same as today.
