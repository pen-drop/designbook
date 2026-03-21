## MODIFIED Requirements

### Requirement: Panel polling interval
The panel SHALL subscribe to `/__designbook/events` via `EventSource` and trigger an immediate refetch of `/__designbook/workflows` and `/__designbook/status` on any received event. The panel SHALL NOT use a fixed polling interval. The `EventSource` connection SHALL be established when the panel becomes active and closed when it becomes inactive.

#### Scenario: Panel is active and a file changes
- **WHEN** the Designbook panel tab is selected
- **AND** any Designbook file changes
- **THEN** the panel SHALL refetch `/__designbook/workflows` and `/__designbook/status` immediately

#### Scenario: Panel is hidden
- **WHEN** the Designbook panel tab is not selected
- **THEN** the panel SHALL close its `EventSource` connection and NOT refetch

## REMOVED Requirements

### Requirement: Granular Vite WebSocket change events
**Reason**: Replaced by SSE endpoint. The five granular WS events (`designbook:data-model-change`, `designbook:data-change`, `designbook:tokens-change`, `designbook:view-mode-change`, `designbook:workflow-change`) had no consumers and are superseded by `/__designbook/events`.
**Migration**: No consumer migration needed — these events were unused.
