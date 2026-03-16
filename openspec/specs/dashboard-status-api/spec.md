# dashboard-status-api Specification

## Purpose
TBD - created by archiving change designbook-dashboard. Update Purpose after archive.
## Requirements
### Requirement: Status endpoint returns project state
The Vite plugin SHALL expose a `GET /__designbook/status` endpoint that returns a JSON object describing the existence and status of all Designbook-managed files.

#### Scenario: Full project with all files present
- **WHEN** a GET request is made to `/__designbook/status` and all managed files exist
- **THEN** the response is HTTP 200 with JSON containing `designSystem.tokens.exists: true`, `dataModel.exists: true`, `shell.exists: true`, and sections array with per-section status

#### Scenario: Empty project with no files
- **WHEN** a GET request is made to `/__designbook/status` and no managed files exist
- **THEN** the response is HTTP 200 with JSON containing `designSystem.tokens.exists: false`, `dataModel.exists: false`, `shell.exists: false`, and empty sections array

### Requirement: Status endpoint includes section details
For each directory under `$DESIGNBOOK_DIST/sections/`, the endpoint SHALL return the section id, title (parsed from scenes file if available), whether the scenes file exists, whether data.yml exists, and the count of matching view-mode `.jsonata` files.

#### Scenario: Section with scenes, data, and view modes
- **WHEN** section "episodenguide" has `episodenguide.section.scenes.yml`, `data.yml`, and view-modes `node.episode.teaser.jsonata`, `node.episode.full.jsonata`
- **THEN** the sections array contains an entry with `id: "episodenguide"`, `scenes: true`, `sceneCount` from parsed file, `data: true`, `viewModes: 2`

#### Scenario: View-mode count scoped to section entities
- **WHEN** the view-modes directory contains files for multiple entity types
- **THEN** the section's `viewModes` count includes all `.jsonata` files (not scoped per section, as view modes are shared)

### Requirement: Status endpoint includes workflow data
The status endpoint SHALL include the workflow data (same as `/__designbook/workflows`) in the response under a `workflows` key, avoiding a separate fetch.

#### Scenario: Workflows included in status response
- **WHEN** a GET request is made to `/__designbook/status` and there are active and archived workflows
- **THEN** the response includes a `workflows` array with the same data as `/__designbook/workflows`

### Requirement: Status endpoint returns shell scene count
The endpoint SHALL parse the shell scenes file and return the number of scenes defined.

#### Scenario: Shell with multiple scenes
- **WHEN** `shell/spec.shell.scenes.yml` exists with 2 scenes
- **THEN** the response includes `shell.exists: true` and `shell.sceneCount: 2`

