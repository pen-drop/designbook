## Context

`workflow-execution.md` is the binding execution reference for all `debo` workflows. Agents read it before every workflow run. Three issues were found during a `--research` audit of `design-screen home`:

1. Phase 0 instructs agents to "Show all DESIGNBOOK_* variables to the user" — but no CLI command exists for this, and the information is internal context, not user-facing.
2. Env vars set via `eval "$(npx ... config)"` are lost between Bash tool calls. Agents reference `$DESIGNBOOK_HOME` in later calls and get empty strings.
3. `workflow plan` rejects missing params with cryptic errors. The `expected_params` data from `workflow instructions` is available but undocumented.

## Goals / Non-Goals

**Goals:**
- Remove the dead "show config" instruction from Phase 0
- Clarify that `_debo()` handles re-bootstrap and that raw `$DESIGNBOOK_*` references outside `_debo` are unreliable
- Document the `expected_params` → `--params` flow so agents can build correct params on the first attempt

**Non-Goals:**
- Changing the CLI behavior (no TypeScript changes)
- Fixing the env var persistence issue at the shell level (that's a Bash tool limitation)
- Refactoring task files to remove HOW instructions (separate change)

## Decisions

### 1. Remove config display entirely (not replace)

The "Show all DESIGNBOOK_* variables" instruction has no user value. Agents need the vars internally, and `_debo()` handles bootstrap. Removing it is cleaner than adding a CLI command.

**Alternative considered:** Add a `config show` CLI command — rejected because it adds code for a debugging need that `env | grep DESIGNBOOK` already covers.

### 2. Add a "Bootstrap Scope" note to Phase 0

Add a note clarifying that `DESIGNBOOK_*` variables are only available within the same Bash block that ran `eval`. The `_debo()` helper re-bootstraps on each call, so agents should use `_debo` for all CLI calls and capture specific values they need into shell variables within the same block.

### 3. Include `expected_params` in `workflow create` response

The CLI already resolves all stages and their task files at `workflow create` time (stored in `step_resolved`). Each task file's frontmatter declares `params:` with required/optional markers. Aggregate these into a single `expected_params` map in the `workflow create` JSON response.

Output shape:
```json
{
  "name": "design-screen-2026-04-03-xxxx",
  "steps": [...],
  "stages": {...},
  "step_resolved": {...},
  "expected_params": {
    "section_id": { "required": true, "from_step": "create-sample-data" },
    "section_title": { "required": true, "from_step": "design-screen:create-scene" },
    "entity_type": { "required": true, "from_step": "design-screen:map-entity" },
    "bundle": { "required": true, "from_step": "design-screen:map-entity" },
    "view_mode": { "required": true, "from_step": "design-screen:map-entity" }
  }
}
```

The agent reads `expected_params` from the create response and maps intake results to required params before calling `workflow plan`. No extra CLI calls needed.

**Alternative considered:** Add a separate `workflow discover-params` command — rejected because the data is already available at create time.

## Risks / Trade-offs

- **Risk:** Agents may still hard-reference `$DESIGNBOOK_HOME` outside `_debo` blocks → **Mitigation:** The note makes it explicit; the `_debo()` pattern already works correctly.
- **Trade-off:** `workflow create` response becomes slightly larger → negligible, params map is small.
