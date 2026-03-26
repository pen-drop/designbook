## ADDED Requirements

### Requirement: DeboLink component for Storybook-internal navigation

The system SHALL provide a `DeboLink` React component that navigates to Storybook stories via the `selectStory` channel event without causing a page reload.

DeboLink SHALL accept either a `storyId` prop (string) or a combination of `title` and `name` props. It SHALL render as an `<a>` element with a valid `href` fallback.

#### Scenario: Navigate by storyId
- **WHEN** user clicks a DeboLink with `storyId="designbook-sections-hero--overview"`
- **THEN** the component emits `selectStory` with `{ storyId: "designbook-sections-hero--overview" }` on the Storybook channel
- **AND** no full page reload occurs

#### Scenario: Navigate by title and name
- **WHEN** user clicks a DeboLink with `title="Designbook/Sections/Hero"` and `name="Overview"`
- **THEN** the component emits `selectStory` with `{ title: "Designbook/Sections/Hero", name: "Overview" }` on the Storybook channel

#### Scenario: Fallback href for right-click
- **WHEN** user right-clicks a DeboLink and selects "Open in new tab"
- **THEN** the browser opens a valid Storybook URL via the rendered `href` attribute

### Requirement: DeboSceneCard uses DeboLink for navigation

DeboSceneCard SHALL use DeboLink instead of direct `window.top.location` manipulation. The duplicated `navigateStorybook()` function SHALL be removed.

#### Scenario: Scene card click navigates without reload
- **WHEN** user clicks a scene card with a story path
- **THEN** Storybook navigates to the scene story internally without page reload

### Requirement: DeboNumberedList uses DeboLink for navigation

DeboNumberedList items with links SHALL use DeboLink instead of the duplicated `navigateStorybook()` function. The function SHALL be removed.

#### Scenario: List item click navigates without reload
- **WHEN** user clicks a numbered list item with a link
- **THEN** Storybook navigates to the target story internally without page reload

### Requirement: DeboSceneGrid uses title+name instead of manual ID construction

DeboSceneGrid SHALL pass `title` and `name` to DeboLink instead of constructing story IDs via `toStoryId()`. The `toStoryId()` function SHALL be removed.

#### Scenario: Scene grid links use title-based navigation
- **WHEN** a scene grid renders scene cards for group "Designbook/Design System" with scene name "Shell"
- **THEN** DeboLink receives `title="Designbook/Design System/Scenes"` and `name="Shell"`

### Requirement: useSections hook fetches live section data

The system SHALL provide a `useSections()` hook that fetches section data from the `/__designbook/status` endpoint and re-fetches when relevant file change events occur on the Storybook channel.

#### Scenario: Initial load
- **WHEN** a component using `useSections()` mounts
- **THEN** it fetches `/__designbook/status` and returns the `sections` array

#### Scenario: Live update on section file change
- **WHEN** a `designbook:file-add` or `designbook:file-update` event fires with a path starting with `sections/`
- **THEN** `useSections()` re-fetches `/__designbook/status` and returns updated data

#### Scenario: Live update on section file deletion
- **WHEN** a `designbook:file-delete` event fires with a path starting with `sections/`
- **THEN** `useSections()` re-fetches `/__designbook/status` and returns updated data

### Requirement: DeboSectionsOverview uses useSections and shows heading

DeboSectionsOverview SHALL use the `useSections()` hook instead of `virtual:designbook-sections`. It SHALL display a "Sections" heading in both empty and non-empty states.

#### Scenario: Empty state with heading
- **WHEN** no sections exist
- **THEN** a "Sections" heading is displayed above the empty state message

#### Scenario: Non-empty state with heading
- **WHEN** sections exist
- **THEN** a "Sections" heading is displayed above the sections list

#### Scenario: Section links use DeboLink
- **WHEN** sections are listed
- **THEN** each section links to its overview story via DeboLink with the section's story title and name "Overview"
