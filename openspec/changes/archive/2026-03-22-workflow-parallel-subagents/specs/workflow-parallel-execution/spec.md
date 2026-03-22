## ADDED Requirements

### Requirement: DAG orchestrator dispatches tasks in parallel waves

After `workflow plan` completes, the main agent SHALL execute tasks as isolated subagents using a DAG scheduling loop.

#### Scenario: Ready tasks dispatched in parallel
- **WHEN** the DAG loop starts
- **THEN** all tasks with `depends_on: []` or whose dependencies are all `done` are dispatched simultaneously as Agent tool calls

#### Scenario: Next wave waits for current wave
- **WHEN** a wave of subagents completes
- **THEN** the orchestrator re-evaluates the DAG, finds newly-ready tasks, and dispatches the next wave

#### Scenario: Wave progress is reported
- **WHEN** a wave completes
- **THEN** the orchestrator outputs one line: "Wave N complete: X/Y tasks done"

#### Scenario: All tasks done ends orchestration
- **WHEN** all tasks have status `done`
- **THEN** the orchestrator exits the DAG loop and the workflow auto-archives

#### Scenario: Circular dependency is detected
- **WHEN** no tasks are ready but pending tasks remain
- **THEN** the orchestrator stops and reports: "Deadlock: circular dependency detected in tasks [id-list]"

### Requirement: Each subagent executes exactly one task in isolation

Each subagent spawned by the orchestrator SHALL execute a single workflow task with a fresh context window.

#### Scenario: Subagent receives minimal prompt
- **WHEN** the orchestrator spawns a subagent
- **THEN** the prompt contains: workflow name, task ID, absolute path to tasks.yml, and instruction to execute the task

#### Scenario: Subagent reads pre-resolved data from tasks.yml
- **WHEN** a subagent starts
- **THEN** it reads tasks.yml, finds its task by ID, and uses the pre-resolved `task_file`, `params`, `rules`, and `files` — no skill scanning needed

#### Scenario: Subagent reads rule files directly
- **WHEN** a subagent needs to apply rules
- **THEN** it reads the files listed in `task.rules[]` directly — replaces Rule 5b scanning

#### Scenario: Subagent reads global and per-task params
- **WHEN** a subagent needs intake context
- **THEN** it reads top-level `params` for global context and `task.params` for task-specific context

#### Scenario: Subagent follows standard validate/done cycle
- **WHEN** a subagent creates its files
- **THEN** it runs `workflow validate`, fixes errors until exit 0, then calls `workflow done`

### Requirement: Execution starts immediately after plan with Ctrl+C abort

After displaying the plan, execution SHALL start without requiring user confirmation.

#### Scenario: Plan shown then execution begins
- **WHEN** `workflow plan` completes
- **THEN** the orchestrator outputs the plan summary and immediately begins DAG execution

#### Scenario: User can abort mid-execution
- **WHEN** the user presses Ctrl+C
- **THEN** in-flight subagents may complete independently; the workflow can be resumed later via Rule 1 (Resume Check)
