## MODIFIED Requirements

### Requirement: Phase 1 removes separate plan step

The `workflow-execution.md` Phase 1 SHALL be simplified to remove the separate `workflow plan` step. Instead, the agent passes `--params` directly to `workflow done --task intake`. The Phase 1 steps become: (1) Resume Check + Create, (2) Load Intake Instructions, (3) Before Hooks, (4) Execute Intake + Done with Params.

#### Scenario: Agent completes intake in one done call
- **WHEN** the agent finishes intake and has built the params JSON from intake results
- **THEN** the agent calls `workflow done --workflow $WORKFLOW_NAME --task intake --params '<json>'` — the CLI receives params, expands iterables into tasks internally, marks intake done, and returns the task list

#### Scenario: Existing workflow resume skips intake
- **WHEN** the agent resumes an existing workflow where intake is already done
- **THEN** the agent skips directly to Phase 2 (Execute) without re-running intake or plan

### Requirement: Plan step removed from documentation

The `workflow-execution.md` SHALL NOT contain a separate "Step 5: Plan" section. The plan logic is implicit in the `workflow done --task intake --params` call. The `workflow plan` CLI command remains available for backward compatibility but is no longer documented as a required step.

#### Scenario: No plan step in Phase 1
- **WHEN** an agent reads `workflow-execution.md` Phase 1
- **THEN** there is no separate plan step — params are passed via `workflow done --task intake --params`
