## REMOVED Requirements

### Requirement: Bootstrap displays environment variables

**Reason**: The "Show all DESIGNBOOK_* variables to the user" instruction in Phase 0 has no corresponding CLI command (`config show` does not exist) and provides no user value. Agents need the vars internally; `_debo()` handles bootstrap.

**Migration**: Remove the instruction from `workflow-execution.md` Phase 0. No agent behavior change needed — agents that displayed vars will simply skip the step.

## ADDED Requirements

### Requirement: Bootstrap scope documentation

The workflow-execution skill file SHALL document that `DESIGNBOOK_*` environment variables set via `eval "$(npx storybook-addon-designbook config)"` are scoped to the current shell invocation only. The `_debo()` helper function SHALL be the canonical way to ensure bootstrap state is available — it re-bootstraps on first call within each Bash block.

#### Scenario: Agent uses _debo for all CLI calls
- **WHEN** an agent needs to call a Designbook CLI command
- **THEN** it SHALL use `_debo <command>` which re-bootstraps if `$DESIGNBOOK_HOME` is unset

#### Scenario: Agent needs DESIGNBOOK_HOME in a Bash block
- **WHEN** an agent needs to reference `$DESIGNBOOK_HOME` for path construction (e.g. `--workflow-file`)
- **THEN** it SHALL capture the value within the same Bash block that runs `_debo`, not reference it from a prior block

#### Scenario: Phase 0 does not display config
- **WHEN** Phase 0 Bootstrap completes
- **THEN** the agent SHALL NOT display or list `DESIGNBOOK_*` variables to the user
