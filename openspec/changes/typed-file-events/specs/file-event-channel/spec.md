## ADDED Requirements

### Requirement: Typed file-change events via Storybook channel
The vite-plugin SHALL broadcast file-change events over the Storybook WebSocket channel using `server.ws.send({ type: 'custom', event: 'designbook:file-<action>', data })` where action is `add`, `update`, or `delete`. Each event payload SHALL include `fileType` (string) and `path` (relative path from the project root).

#### Scenario: File matching a known type is modified
- **WHEN** a watched file is saved and its relative path matches a static glob pattern
- **THEN** the plugin SHALL emit `designbook:file-update` with `{ fileType: '<matched-type>', path: '<relative-path>' }`

#### Scenario: File matching a known type is created
- **WHEN** a new file is created and its relative path matches a static glob pattern
- **THEN** the plugin SHALL emit `designbook:file-add` with `{ fileType: '<matched-type>', path: '<relative-path>' }`

#### Scenario: File matching a known type is deleted
- **WHEN** a file is deleted and its relative path matched a static glob pattern
- **THEN** the plugin SHALL emit `designbook:file-delete` with `{ fileType: '<matched-type>', path: '<relative-path>' }`

#### Scenario: File does not match any known type
- **WHEN** a watched file changes and its path matches no defined glob pattern
- **THEN** the plugin SHALL NOT emit any channel event

### Requirement: Static file-type glob map
The vite-plugin SHALL define a static mapping of file type names to glob patterns. The first matching pattern SHALL determine the event's `fileType`. Each file path SHALL match at most one type.

#### Scenario: Path matches first glob
- **WHEN** a file path matches multiple globs (if ordering allows)
- **THEN** only the first match in definition order SHALL be used

### Requirement: useDesignbookData channel subscription
The `useDesignbookData` hook SHALL subscribe to `designbook:file-add`, `designbook:file-update`, and `designbook:file-delete` channel events using `addons.getChannel()`. It SHALL NOT open an `EventSource` connection.

#### Scenario: Watched file is updated
- **WHEN** a `designbook:file-update` event arrives with `path` matching the hook's `path` argument
- **THEN** the hook SHALL re-fetch the file via `/__designbook/load`

#### Scenario: Watched file is deleted
- **WHEN** a `designbook:file-delete` event arrives with `path` matching the hook's `path` argument
- **THEN** the hook SHALL set `data` to `null` without fetching

#### Scenario: Unrelated file changes
- **WHEN** a channel event arrives with a `path` that does not match the hook's `path` argument
- **THEN** the hook SHALL NOT re-fetch or change state

#### Scenario: Unstable parser reference
- **WHEN** the parent component re-renders and passes a new `parser` function reference
- **THEN** the hook SHALL NOT re-subscribe to the channel or trigger a re-fetch
