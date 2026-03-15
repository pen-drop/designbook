## MODIFIED Requirements

### Requirement: Shell scene file location and naming

The shell layout scenes SHALL be stored at `designbook/design-system/design-system.scenes.yml` instead of `designbook/shell/spec.shell.scenes.yml`. The file format (id, title, description, status, scenes with layout slots) SHALL remain unchanged.

#### Scenario: Generated file path

- **WHEN** the shell workflow generates layout scenes
- **THEN** the output file is `designbook/design-system/design-system.scenes.yml`
- **AND** the `designbook/shell/` directory is NOT used

#### Scenario: Layout inheritance via scene reference

- **WHEN** a section scene file uses `layout: "design-system:shell"`
- **THEN** the vite-plugin resolves to `designbook/design-system/*.scenes.yml` and finds the scene named `shell`
- **AND** the section inherits header, footer, and sidebar slots from that scene

#### Scenario: Scene named "shell" inside the file

- **WHEN** `design-system.scenes.yml` is generated
- **THEN** it contains `id`, `title`, `description`, `status`, `order`, `name`, and a `scenes` array
- **AND** the scene defining the layout slots (header, content, footer, sidebar) is named `shell`

## REMOVED Requirements

### Requirement: Standalone shell page registration

**Reason**: Shell is now part of the Design System. No separate page file or component needed.

**Migration**: Delete `src/pages/spec.shell.scenes.yml`. Remove `DeboShellPage` component and its export from `pages/index.js`.

### Requirement: Shell directory convention

**Reason**: Shell data moves to `designbook/design-system/`. The `designbook/shell/` directory is eliminated.

**Migration**: Re-run `/debo-design-shell` to generate files at the new location.
