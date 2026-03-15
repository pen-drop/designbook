## ADDED Requirements

### Requirement: DeboSceneCard renders scene with themed letter icon
The `DeboSceneCard` component SHALL render a card with a circular letter icon (first character of scene name), the scene title, and optional modified date. The card SHALL use `data-theme` to apply a DaisyUI theme, with the letter circle using `bg-primary` / `text-primary-content`.

#### Scenario: Card with theme and all metadata
- **WHEN** DeboSceneCard receives `title="Default"`, `theme="cupcake"`, and `modified="2026-03-10"`
- **THEN** the card renders with `data-theme="cupcake"`, a circle showing "D" in primary colors, the title "Default", and relative date text

#### Scenario: Card without theme
- **WHEN** DeboSceneCard receives `title="Mobile View"` with no `theme` prop
- **THEN** the card renders with a default theme fallback

#### Scenario: Card without modified date
- **WHEN** DeboSceneCard receives `title="Mobile View"` and `theme="dark"` with no `modified` prop
- **THEN** the card renders the themed letter circle and title, with no date line

### Requirement: DeboSceneGrid renders scene list as card grid
The `DeboSceneGrid` display component SHALL accept parsed scenes.yml data and render each scene as a `DeboSceneCard` in a responsive grid layout.

#### Scenario: Multiple scenes rendered
- **WHEN** DeboSceneGrid receives data with 3 scenes
- **THEN** 3 DeboSceneCard components are rendered in a grid (responsive: 1 column on small, 2-3 columns on wider)

#### Scenario: Single scene
- **WHEN** DeboSceneGrid receives data with 1 scene
- **THEN** 1 DeboSceneCard is rendered without grid artifacts

### Requirement: DeboSectionPage Design step uses DeboSceneGrid
The Design step in `DeboSectionPage` SHALL use `DeboSceneGrid` instead of `DeboSampleData` to render the scene listing. The parser SHALL return `null` when the `scenes` array is empty or missing, so that `DeboSection` shows the empty state.

#### Scenario: Design step displays scene cards
- **WHEN** the Design step loads a valid `*.section.scenes.yml` file with scenes
- **THEN** the scenes are displayed as visual cards via `DeboSceneGrid`

#### Scenario: Design step shows empty state when no scenes
- **WHEN** the Design step loads a `*.section.scenes.yml` file with no `scenes` array or an empty `scenes` array
- **THEN** DeboSection shows the empty state with the command hint
