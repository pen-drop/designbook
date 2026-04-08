# debo-link-navigation Specification

## Purpose
Defines requirements for internal Storybook navigation using `DeboLink`, `useSections` hook, and consumer components.

## Requirements

### Requirement: DeboLink component for Storybook-internal navigation
`DeboLink` SHALL navigate to stories via the `selectStory` channel event without page reload. It accepts either `storyId` (string) or `title`+`name` props, rendering as a styled `<a>` with a valid `href` fallback (`?path=/story/{storyId}`).

- Click with `storyId` emits `selectStory` with `{ storyId }` — no reload
- Click with `title`+`name` emits `selectStory` with `{ title, name }`
- Right-click "Open in new tab" works via rendered `href` attribute

### Requirement: DeboSceneCard uses DeboLink
DeboSceneCard SHALL use DeboLink instead of `window.top.location`. Accepts `storyId`, `storyTitle`, `storyName` and delegates navigation to DeboLink.

### Requirement: DeboNumberedList uses DeboLink
List items with `storyId`, `storyTitle`, or `storyName` SHALL be wrapped in DeboLink for reload-free navigation.

### Requirement: DeboSceneGrid passes title and name to DeboSceneCard
DeboSceneGrid SHALL compute `storyTitle` as `"{group}/Scenes"` and pass it with `storyName` to DeboSceneCard.

- For group "Designbook/Design System" with scene "Shell": `storyTitle="Designbook/Design System/Scenes"`, `storyName="Shell"`

### Requirement: toStoryId utility
`toStoryId` in `story-entity.ts` constructs canonical story IDs from title and export name (sanitize + join with `--`). Used by `DeboStory` for scene-to-story resolution.

- `toStoryId("Designbook/Sections/Hero/Scenes", "Overview")` returns `"designbook-sections-hero-scenes--overview"`

### Requirement: useSections hook
`useSections()` fetches section data from `/__designbook/status` and re-fetches on `designbook:file-add`, `designbook:file-update`, or `designbook:file-delete` events with paths starting with `sections/`.

### Requirement: DeboSectionsOverview uses useSections
SHALL use `useSections()` instead of `virtual:designbook-sections`. Displays a "Sections" heading in all states (loading, empty, non-empty). Section links use DeboNumberedList with `storyTitle="Designbook/Sections/{title}"` and `storyName="Overview"`.
