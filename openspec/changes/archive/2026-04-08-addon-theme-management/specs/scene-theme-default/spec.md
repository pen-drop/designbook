## ADDED Requirements

### Requirement: Scene YAML supports a theme property

Each scene entry in a `*.scenes.yml` file SHALL accept an optional `theme` property that declares the scene's default theme.

#### Scenario: Scene with explicit theme

- **WHEN** a scene entry declares `theme: "dark"`
- **THEN** the built story SHALL have `args.theme` set to `"dark"`

#### Scenario: Scene without theme property

- **WHEN** a scene entry has no `theme` property
- **THEN** the built story SHALL have `args.theme` default to `"light"`

#### Scenario: Scene with custom theme name

- **WHEN** a scene entry declares `theme: "brand-x"`
- **THEN** the built story SHALL have `args.theme` set to `"brand-x"`

### Requirement: Scene render wraps output with data-theme attribute

The CSF module generated for scenes SHALL wrap the rendered output in a root element with `data-theme` set from `args.theme`.

#### Scenario: HTML framework scene renders with data-theme wrapper

- **WHEN** a scene story renders in the HTML/Twig framework
- **THEN** the output SHALL be wrapped in `<div data-theme="${args.theme}">...</div>`

#### Scenario: Theme value is reactive to args changes

- **WHEN** `args.theme` changes (via toolbar or Controls)
- **THEN** the `data-theme` attribute on the wrapper SHALL update accordingly

### Requirement: Visual compare uses scene's default theme

Screenshots for visual comparison SHALL use the scene's `data-theme` from the DOM without URL parameter overrides.

#### Scenario: Screenshot captures scene with its default theme

- **WHEN** a visual compare screenshot is taken for a scene with `theme: "dark"`
- **THEN** the screenshot SHALL show the dark theme rendering
- **AND** no `?globals=theme:dark` URL parameter SHALL be needed
