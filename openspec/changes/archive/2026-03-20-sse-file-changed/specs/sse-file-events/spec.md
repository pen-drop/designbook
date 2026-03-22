## ADDED Requirements

### Requirement: SSE endpoint for file change events
The Vite plugin SHALL expose a `/__designbook/events` endpoint that streams Server-Sent Events. The endpoint SHALL send an event whenever any watched file in the `designbook/` directory is added, changed, or removed. Each event SHALL be a ping with no payload (`data: {}\n\n`). Consumers reconnect automatically via browser `EventSource` behavior.

#### Scenario: File changes in designbook/
- **WHEN** any file in `designbook/` is added, changed, or removed
- **THEN** the server SHALL send `data: {}\n\n` to all connected SSE clients

#### Scenario: Consumer connects
- **WHEN** a client opens an `EventSource` to `/__designbook/events`
- **THEN** the server SHALL keep the connection open with `Content-Type: text/event-stream`
- **AND** send a ping immediately on the next file change

#### Scenario: Consumer disconnects
- **WHEN** the SSE client disconnects
- **THEN** the server SHALL remove it from the active connections list

### Requirement: useDesignbookData auto-reload on file change
`useDesignbookData` SHALL subscribe to `/__designbook/events` via `EventSource` and call `reload()` on any received event. The subscription SHALL be established on mount and cleaned up on unmount.

#### Scenario: File changes while hook is mounted
- **WHEN** any Designbook file changes
- **THEN** `useDesignbookData` SHALL reload its data within one network round-trip

#### Scenario: Component unmounts
- **WHEN** the component using `useDesignbookData` unmounts
- **THEN** the `EventSource` connection SHALL be closed
