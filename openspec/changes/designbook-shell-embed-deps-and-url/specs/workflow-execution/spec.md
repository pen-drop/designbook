## MODIFIED Requirements

### Requirement: Response-driven execution

`workflow done` returns `RESPONSE:` JSON that drives all execution. AI MUST follow the response.

| Condition | Response |
|-----------|----------|
| More pending tasks in stage | `{ "stage": "<current>", "next_step": "<step>" }` |
| Stage transition | `{ "stage": "<next>", "transition_from": "<prev>", "next_stage": "<next>", "next_step": "<step>" }` |
| Unfulfilled stage params | `{ "waiting_for": { "<key>": { "type": "<type>", "prompt": "<text>" } } }` |
| Subworkflow dispatch | `{ "stage": "done", "dispatch": [{ "workflow": "<id>", "workflow_file": "<path>", "params": {...} }] }` |
| All stages exhausted | `{ "stage": "done" }`, workflow archived |

When a task involves building multiple components (iterable expansion via `each: component`), the component list SHALL be ordered by embed dependencies resolved from loaded blueprints. Components whose blueprints have no `embeds:` field are built first; components that are listed in other blueprints' `embeds:` arrays are built before those that embed them.

#### Scenario: Component iteration follows dependency order
- **WHEN** a workflow expands the `component` iterable and blueprints declare embed dependencies
- **THEN** the expanded tasks are ordered so that embedded components (e.g., container) are built before embedders (e.g., header, footer)

#### Scenario: Standard response-driven execution unchanged
- **WHEN** `workflow done` is called for a stage with no embed dependencies
- **THEN** the response follows the existing condition table without modification
