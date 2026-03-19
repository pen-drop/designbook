## MODIFIED Requirements

### Requirement: Panel polling interval
The panel SHALL fetch `/__designbook/workflows` once on mount (when active). Subsequent updates SHALL be driven by `designbook:file-update` and `designbook:file-add` channel events with `fileType === 'task'`. The panel SHALL NOT poll on a fixed interval.

#### Scenario: Panel becomes active
- **WHEN** the Designbook panel tab is selected
- **THEN** it SHALL fetch `/__designbook/workflows` once to populate initial state

#### Scenario: Task file is updated
- **WHEN** a `designbook:file-update` event arrives with `fileType === 'task'`
- **THEN** the panel SHALL re-fetch `/__designbook/workflows` to refresh task state

#### Scenario: Task file is added
- **WHEN** a `designbook:file-add` event arrives with `fileType === 'task'`
- **THEN** the panel SHALL re-fetch `/__designbook/workflows`

#### Scenario: Panel is hidden
- **WHEN** the Designbook panel tab is not selected
- **THEN** it SHALL NOT react to channel events or fetch any endpoints
