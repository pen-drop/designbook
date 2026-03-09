## Context

The `debo-design-screen` workflow is the most complex Designbook workflow. It orchestrates 6 skills to create screen designs for a section. Currently, Step 3 forces all skills (~150KB of instructions) to be read upfront before any execution begins. This overwhelms the AI model's context window, causing unreliable behavior.

The project uses `designbook.config.yml` to configure which component framework (`frameworks.component`, e.g., `sdc`) and CSS framework (`frameworks.css`, e.g., `daisyui`) are active. Skills are named by convention: `designbook-components-{FRAMEWORK_COMPONENT}` and `designbook-css-{FRAMEWORK_CSS}`. The workflow must resolve these dynamically rather than hardcoding skill names.

The `debo-design-shell` workflow demonstrates a better pattern: skills are loaded just-in-time, only when needed for a specific execution step.

## Goals / Non-Goals

**Goals:**
- Reduce max context at any workflow step from ~150KB to ~25KB
- Each execution step loads only the skill it needs (just-in-time)
- Remove the plan-and-approve step — execute directly or `--spec` dry run
- Shell becomes a prerequisite (fail-fast), not generated inline
- CSS generation delegates to `//debo-css-generate` workflow
- Remove dead `components-entity-sdc` reference

**Non-Goals:**
- Changing any skill files themselves — skills stay as-is
- Changing the `debo-design-shell` workflow
- Changing the Storybook addon rendering pipeline
- Splitting the workflow into multiple smaller workflows

## Decisions

### 1. Just-in-time skill loading (not upfront)

**Decision:** Each execution step reads its skill immediately before executing, then moves on. The workflow MUST source `designbook-configuration` first (`source .agent/skills/designbook-configuration/scripts/set-env.sh`) to resolve `$DESIGNBOOK_FRAMEWORK_COMPONENT` and `$DESIGNBOOK_FRAMEWORK_CSS`.

**Rationale:** The `debo-design-shell` workflow already uses this pattern successfully. Loading ~25KB at a time vs ~150KB all at once dramatically improves reliability.

**Alternative considered:** Splitting into multiple smaller workflows. Rejected because the steps have a natural dependency chain (components → view modes → scenes) and orchestration across multiple workflows would add complexity.

### 2. No plan step — direct execution with `--spec` escape hatch

**Decision:** Remove Step 4 (plan generation + approval). The workflow executes immediately after section selection. `--spec` flag outputs what WOULD be created without writing files.

**Rationale:** The plan step was where the model needed to hold all 150KB of context and reason about it — the exact failure point. The section spec + data already define what's needed.

### 3. Shell as prerequisite

**Decision:** The workflow checks for `shell.scenes.yml` and page/header/footer components. If missing, it tells the user to run `/debo-design-shell` first and stops.

**Rationale:** Shell generation is already a separate workflow. Duplicating it here adds complexity and causes the workflow to load shell-generation resources unnecessarily.

### 4. CSS generation via delegation

**Decision:** After component creation, run `//debo-css-generate` as a delegated workflow call instead of loading CSS skills inline.

**Rationale:** The CSS pipeline is self-contained with its own orchestration. It internally resolves `$DESIGNBOOK_FRAMEWORK_CSS` to load the correct framework skill. Loading `daisyui-llms.txt` (62KB) into a screen design workflow is wasteful.

### 5. Framework-aware skill resolution

**Decision:** The workflow loads component skills by convention: `designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT` (e.g., `designbook-components-sdc`). It MUST NOT hardcode `sdc` or any other specific framework.

**Rationale:** The naming convention is defined by the `designbook-addon-skills` meta-skill (concern-first, framework-last). Skills are loaded based on `DESIGNBOOK_FRAMEWORK_COMPONENT`, `DESIGNBOOK_FRAMEWORK_CSS`, and `DESIGNBOOK_BACKEND` environment variables. The workflow follows the same pattern already used by `//debo-css-generate`.

**Alternative considered:** Hardcoding `sdc` since it's the only component framework today. Rejected because it breaks the pluggable architecture if a new framework is added.

## Risks / Trade-offs

- **[No plan approval]** → Users lose the preview-before-execute safety net. Mitigated by `--spec` flag for dry runs.
- **[Just-in-time loading]** → Skills are read mid-execution, adding minor overhead. Mitigated because each skill is read once and the overhead is trivial vs. the context savings.
- **[Shell prerequisite]** → Users must run `debo-design-shell` before `debo-design-screen`. Mitigated by clear error message pointing to the prerequisite workflow.
