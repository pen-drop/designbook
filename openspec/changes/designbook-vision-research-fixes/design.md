## Context

The `workflow-execution.md` resource file is the binding execution reference for all `debo` workflows. An AI agent reads this file at the start of every workflow and follows its instructions verbatim. Ambiguities or incorrect patterns in this file directly cause retries, failed commands, and wasted tokens.

The `--research` audit of the `vision` workflow identified three documentation issues that caused execution friction, plus one rule/task duplication.

## Goals / Non-Goals

**Goals:**
- Eliminate the three documented friction points in `workflow-execution.md`
- Remove duplicated constraints between `vision-format.md` and `create-vision.md`
- Keep changes minimal and backward-compatible — no CLI changes, only documentation fixes

**Non-Goals:**
- Changing CLI behavior or task ID generation logic
- Restructuring the workflow execution phases
- Fixing issues in other workflows (only `vision`-specific duplication is addressed)

## Decisions

### D1: Replace `_debo()` helper with inline eval pattern

The `_debo()` function pattern assumes shell state persists across Bash tool calls. In practice, each tool call starts a fresh shell. The function itself works within a single call, but the documentation implies it can be defined once and reused — which is misleading.

**Decision:** Keep `_debo()` as a within-block helper but add explicit documentation that it must be redefined in every Bash block. Add the inline `eval "$(npx storybook-addon-designbook config)" && ...` as an alternative pattern for simple one-command calls.

**Alternative considered:** Remove `_debo()` entirely in favor of always inlining `eval`. Rejected because `_debo()` is more efficient when multiple CLI calls happen in one block (bootstraps once).

### D2: Document task ID naming convention

Task IDs follow the pattern `<step>-<param_value>` where `param_value` preserves original casing and spaces from the intake params (e.g., `create-vision-Designbook Docs`). This is not documented anywhere.

**Decision:** Add a "Task ID Convention" subsection to Phase 2 explaining the naming pattern and recommending agents capture task IDs from `workflow done` or `workflow instructions` responses rather than constructing them manually.

**Alternative considered:** Change CLI to use kebab-case IDs. Rejected — this is a documentation change, not a CLI change (non-goal).

### D3: Clarify singleton vs. required-params distinction

The "Singleton Workflows" section says to call `workflow done --task intake` without `--params`. But "singleton" (no `each`) is orthogonal to "has required params". The `vision` workflow has no `each` but still requires `product_name` and `description`.

**Decision:** Rename the section to "Workflows Without Iterables" and clarify that `--params` is always required when `expected_params` contains any `required: true` entries, regardless of whether stages use `each`. Only truly parameterless workflows (no required expected_params) can omit `--params`.

### D4: Deduplicate vision-format rule

`vision-format.md` repeats two constraints from `create-vision.md`: Problems & Solutions as `### Problem N:` headings, and Key Features as a bulleted list. The task file already specifies the exact file format template.

**Decision:** Remove the duplicated format instructions from `vision-format.md`, keeping only the constraints that are not in the task file (product name heading requirement, directory creation, reading existing file before overwrite).

## Risks / Trade-offs

- [Low] Other workflows may rely on the `_debo()` pattern as currently documented → Mitigation: The helper still works, we're adding clarification, not removing it
- [Low] Thinning `vision-format.md` might remove a constraint an agent relied on for reinforcement → Mitigation: The task file is always loaded and contains the same instructions; rules should not duplicate tasks
