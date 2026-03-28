## Context

`workflow done` currently returns a FLAGS JSON blob (`storybook_preview`, `merge_available`, `next_task`, etc.) that the agent must interpret to determine workflow state and next action. The engine interface has five named methods (`setup`, `commit`, `merge`, `done`, `cleanup`) called at specific lifecycle points, but the mapping from "where are we" to "which method" is implicit.

The existing vocabulary is confusing: "stage" currently means an individual work unit (like `create-component` or `intake`), but in industry convention (GitLab CI, etc.) "stage" means a grouping of related jobs.

The `workflow-engine` change (already implemented) introduced the engine abstraction with `git-worktree` and `direct` engines. This change builds on that by replacing FLAGS with a proper state machine.

## Goals / Non-Goals

**Goals:**
- Replace FLAGS with stage-based workflow responses — agent reacts to state, not flag combinations
- Rename "stage" → "step" (work unit) and introduce "stage" as grouping (execute, test, preview) — align with GitLab CI convention
- Change workflow frontmatter from flat step list to grouped stages/steps structure
- Replace named engine methods with a single `onTransition(from, to)` handler
- Unify all blocking behavior (user review, merge confirmation) via required params on stages
- Auto-skip stages that have no steps assigned

**Non-Goals:**
- New engines beyond `git-worktree` and `direct`
- Pluggable stage definitions (stages are fixed vocabulary per workflow)
- Changing how steps are resolved (task file discovery, rule matching, etc.)
- Changing the validation gate behavior

## Decisions

### Rename stage → step, introduce stage as grouping

**Decision**: What is currently called "stage" becomes "step" everywhere (types, frontmatter, CLI output). "Stage" becomes the new grouping concept. Workflow frontmatter changes from:

```yaml
stages: [intake, create-component, create-scene, storybook-preview]
```

to:

```yaml
stages:
  execute:
    steps: [intake, create-component, create-scene]
  test:
    steps: [visual-diff]
  preview:
    steps: [storybook-preview]
```

**Why**: "stage" and "phase" are near-synonyms, which would confuse users. GitLab CI uses "stage" for grouping and "job" for units — our "step" is analogous to their "job". This naming is widely understood.

**Migration**: All workflow `.md` files need frontmatter migration. `WorkflowTask.stage` field is renamed to `step`. `WorkflowTaskFile.stages` array becomes a `stages` object.

---

### Fixed lifecycle with auto-skip

**Decision**: The full lifecycle is:

```
created → planned → execute → committed → test → preview → finalizing → done
```

`committed` and `finalizing` are implicit stages (always present, no steps). `execute` is always present. `test`, `preview` are declared stages that are skipped when they have no steps.

The state machine derives which stages exist from the workflow frontmatter: if `test:` has no `steps:`, skip directly from `committed` to the next declared stage.

**Why**: A fixed lifecycle with optional stages is simpler than a fully dynamic state graph. Every workflow follows the same pattern — the only variation is which stages are populated.

---

### Engine as transition handler

**Decision**: Replace the `WorkflowEngine` interface:

```typescript
// Before (5 named methods)
interface WorkflowEngine {
  setup(ctx: EngineContext): EngineSetupResult;
  commit(data: WorkflowFile): void;
  merge(data: WorkflowFile): { branch: string; root_dir: string; preview_pid?: number };
  done(data: WorkflowFile): { archive: boolean };
  cleanup(data: WorkflowFile): void;
}

// After (1 method)
interface WorkflowEngine {
  onTransition(from: string, to: string, ctx: TransitionContext): TransitionResult;
}
```

`TransitionResult` can:
- Execute side effects (create worktree, git commit, archive)
- Inject required params that block the transition until provided
- Return env map changes (for `planned → execute` in git-worktree)

**Why**: Named methods create coupling — adding a new lifecycle stage requires adding a new method to every engine. With `onTransition`, engines react to exactly the transitions they care about and ignore the rest.

**Mapping of old methods to transitions:**

| Old method | Transition |
|---|---|
| `setup()` | `planned → execute` |
| `commit()` | `execute → committed` |
| `merge()` + `done()` | `finalizing → done` |
| `cleanup()` | any → `abandoned` (escape hatch) |

---

### Params as unified blocking mechanism

**Decision**: Any stage can declare `params:` in the workflow frontmatter. When the state machine enters a stage with unfulfilled params, it returns a `waiting_for` response. The agent must collect the params (from user or automation) and provide them to continue.

```yaml
stages:
  preview:
    steps: [storybook-preview]
    params:
      user_approved:
        type: boolean
        prompt: "Preview unter {preview_url} — passt alles?"
```

Engines can also inject params on transitions (e.g. git-worktree injects `merge_approved` on `finalizing → done`).

**Why**: This replaces three separate mechanisms: `storybook_preview` flag (→ preview stage param), `merge_available` flag (→ engine-injected param on finalizing), and ad-hoc blocking logic. One mechanism for all cases.

---

### workflow done returns stage-based response

**Decision**: `workflow done` for a step returns one of three response shapes:

1. **Next step in same stage:**
```json
{
  "stage": "execute",
  "step_completed": "intake",
  "next_step": "create-component"
}
```

2. **Stage transition:**
```json
{
  "stage": "committed",
  "transition_from": "execute",
  "next_stage": "test",
  "next_step": "visual-diff"
}
```

3. **Waiting for params:**
```json
{
  "stage": "preview",
  "waiting_for": {
    "user_approved": {
      "type": "boolean",
      "prompt": "Preview unter http://localhost:6006 — passt alles?"
    }
  }
}
```

FLAGS JSON line is removed entirely.

**Why**: The agent no longer interprets flag combinations. It reads the stage, sees what's next or what's missing, and acts accordingly.

---

### WorkflowTaskFile gains current_stage

**Decision**: Add `current_stage: string` to `WorkflowTaskFile`. Updated atomically by `workflow done` when a stage transition occurs. The `stages` field changes from `string[]` to the grouped object structure.

```typescript
interface WorkflowTaskFile {
  // ... existing fields ...
  current_stage: string;           // e.g. 'execute', 'test', 'preview'
  stages: Record<string, {         // keyed by stage name
    steps: string[];               // step names
    params?: Record<string, StageParam>;
  }>;
}
```

**Why**: Any command can read `current_stage` from tasks.yml to know where the workflow is without re-computing from task statuses.

---

### WorkflowTask.stage renamed to step

**Decision**: `WorkflowTask.stage` field is renamed to `step`. A new `stage` field is added that contains the parent stage name (execute, test, preview).

```typescript
interface WorkflowTask {
  // ... existing fields ...
  step: string;    // e.g. 'create-component' (was: stage)
  stage: string;   // e.g. 'execute' (new: parent stage)
}
```

**Why**: Consistent with the vocabulary rename. Each task knows both its step identity and which stage it belongs to.

## Risks / Trade-offs

- **Breaking change to workflow frontmatter** — All workflow `.md` files must be migrated from flat `stages:` list to grouped format. This is a one-time migration across ~15 files.
- **Breaking change to CLI output** — Any tooling parsing FLAGS JSON from `workflow done` must be updated. In practice, only the agent skill resource (`workflow-execution.md`) consumes this.
- **Breaking change to types** — `WorkflowTask.stage` renamed to `step`, `WorkflowTaskFile.stages` type changes. Tests and any code touching these fields must be updated.
- **`onTransition` is stringly-typed** — `from` and `to` are strings, not a type-safe enum. Mitigated by having a fixed set of known stage names. Could add a type union later if needed.
- **Implicit stages (committed, finalizing) are invisible in frontmatter** — They exist in the lifecycle but aren't declared. This is intentional (they're engine concerns, not workflow concerns) but could confuse someone reading only the YAML.
