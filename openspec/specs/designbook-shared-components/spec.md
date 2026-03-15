## Requirements

### Requirement: DeboCard Component
The system SHALL provide a `DeboCard` React component at `.storybook/source/components/DeboCard.jsx` that wraps content in a consistent card style with border, shadow, and padding.

#### Scenario: Card renders with title
- **WHEN** `DeboCard` is rendered with a `title` prop
- **THEN** it displays the title as a card heading
- **AND** it wraps children in a styled card body with `debo:card debo:bg-base-100 debo:border debo:border-base-300 debo:shadow-sm` classes

#### Scenario: Card renders without title
- **WHEN** `DeboCard` is rendered without a `title` prop
- **THEN** it renders the card body without a heading
- **AND** children are displayed inside the card body

#### Scenario: Card supports theme switching
- **WHEN** the theme changes between light and dark
- **THEN** the card adapts its background and border colors accordingly
- **AND** all content remains visible and readable

### Requirement: DeboCollapsible Component
The system SHALL provide a `DeboCollapsible` React component at `.storybook/source/components/DeboCollapsible.jsx` that provides an expandable/collapsible section with title, optional count badge, and chevron toggle.

#### Scenario: Collapsible renders collapsed by default
- **WHEN** `DeboCollapsible` is rendered with a `title` and `children`
- **THEN** it displays the title with a chevron icon
- **AND** the children content is hidden (collapsed)

#### Scenario: Collapsible toggles on click
- **WHEN** user clicks the collapsible header
- **THEN** the children content becomes visible (expanded)
- **AND** the chevron icon rotates to indicate open state
- **AND** clicking again collapses the content

#### Scenario: Collapsible shows count badge
- **WHEN** `DeboCollapsible` is rendered with a `count` prop
- **THEN** it displays the count as a badge next to the title (e.g., `Problems & Solutions (3)`)

#### Scenario: Collapsible supports defaultOpen
- **WHEN** `DeboCollapsible` is rendered with `defaultOpen={true}`
- **THEN** the children content is visible on initial render

### Requirement: DeboSection Component
The system SHALL provide a `DeboSection` React component at `.storybook/source/components/DeboSection.jsx` that combines data loading, empty state, content rendering, reload button, and AI command reference into a single page section wrapper.

#### Scenario: DeboSection loads and displays data
- **WHEN** `DeboSection` is rendered with `dataPath`, `parser`, and `renderContent` props
- **AND** data exists at the specified path in `designbook/`
- **THEN** it loads the data via `/__designbook/load` endpoint
- **AND** parses the Markdown using the provided `parser` function
- **AND** renders the result using the `renderContent` callback

#### Scenario: DeboSection shows loading state
- **WHEN** `DeboSection` is loading data from the Vite middleware
- **THEN** it displays a loading spinner

#### Scenario: DeboSection shows empty state
- **WHEN** no data exists at the specified path (404 response)
- **THEN** it renders a `DeboEmptyState` with the `command` and `emptyMessage` props
- **AND** the empty state references the AI command for data input

#### Scenario: DeboSection shows error state
- **WHEN** data loading fails with an error
- **THEN** it displays an error alert with the error message

#### Scenario: DeboSection provides reload button
- **WHEN** data is displayed successfully
- **THEN** a reload button is shown that refetches and reparses the data
- **AND** a footer references the AI command for updating the data

### Requirement: DeboEmptyState Component
The system SHALL provide a `DeboEmptyState` React component at `.storybook/source/components/DeboEmptyState.jsx` that displays an empty state with AI command reference and instructions.

#### Scenario: Empty state displays AI command reference
- **WHEN** `DeboEmptyState` is rendered with `message` and `command` props
- **THEN** it displays the message as a heading
- **AND** it shows the AI command in a monospace code block
- **AND** it provides instructions to run the AI command in the editor

#### Scenario: Empty state shows file path
- **WHEN** `DeboEmptyState` is rendered with an optional `filePath` prop
- **THEN** it displays the file path where data will be saved

### Requirement: DeboNumberedList Component
The system SHALL provide a `DeboNumberedList` React component at `.storybook/source/components/DeboNumberedList.jsx` that displays an ordered list of items with numbered indicators, titles, and descriptions.

#### Scenario: Numbered list renders items
- **WHEN** `DeboNumberedList` is rendered with an `items` array
- **THEN** it displays each item with a numbered indicator, title, and description
- **AND** items are visually ordered with consistent spacing

#### Scenario: Numbered list handles empty items
- **WHEN** `DeboNumberedList` is rendered with an empty `items` array
- **THEN** it renders nothing or a minimal placeholder

#### Scenario: Numbered list items use consistent styling
- **WHEN** items are rendered
- **THEN** numbered indicators use `debo:` prefixed Tailwind classes
- **AND** titles are displayed with `debo:font-medium` or similar emphasis
- **AND** descriptions use secondary text styling

### Requirement: useDesignbookData Hook
The system SHALL provide a custom React hook `useDesignbookData` at `.storybook/source/hooks/useDesignbookData.js` that encapsulates the common fetch/parse/reload pattern for loading data from the `designbook/` directory.

#### Scenario: Hook loads and parses data
- **WHEN** `useDesignbookData(path, parser)` is called with a valid path
- **AND** the file exists in `designbook/`
- **THEN** it fetches the file via `GET /__designbook/load?path=<path>`
- **AND** passes the response text to the `parser` function
- **AND** returns `{ data: parsedResult, loading: false, error: null, reload }`

#### Scenario: Hook handles missing files
- **WHEN** `useDesignbookData(path, parser)` is called
- **AND** the file does not exist (404 response)
- **THEN** it returns `{ data: null, loading: false, error: null, reload }`

#### Scenario: Hook handles errors
- **WHEN** data loading fails with a network or server error
- **THEN** it returns `{ data: null, loading: false, error: errorMessage, reload }`

#### Scenario: Hook provides reload function
- **WHEN** the `reload` function returned by the hook is called
- **THEN** it refetches the data from the Vite middleware
- **AND** reparses the data using the same `parser` function
- **AND** updates the returned `data`, `loading`, and `error` states

#### Scenario: Hook loads on mount
- **WHEN** the component using the hook mounts
- **THEN** the hook immediately fetches data
- **AND** returns `{ data: null, loading: true, error: null, reload }` during the fetch

### Requirement: Shared Components Use debo: CSS Prefix
All shared `Debo*` components SHALL use `debo:` prefixed Tailwind CSS classes exclusively for CSS isolation.

#### Scenario: Components use prefixed classes
- **WHEN** any `Debo*` component is rendered
- **THEN** all Tailwind utility classes use the `debo:` prefix
- **AND** no unprefixed Tailwind classes are present in the component source

#### Scenario: Components support dark mode
- **WHEN** dark theme is active
- **THEN** all `Debo*` components use `debo:dark:` variant classes where needed
- **AND** all UI elements remain readable in both light and dark themes

### Requirement: Shared component library exports
The shared component library SHALL export all UI primitives and display components via barrel exports. UI components are exported from `components/ui/index.js`, display components from `components/display/index.js`, and all are re-exported from `components/index.js`.

#### Scenario: DeboSceneCard is importable
- **WHEN** a consumer imports `DeboSceneCard` from the components barrel
- **THEN** the component is available and renders correctly

#### Scenario: DeboSceneGrid is importable
- **WHEN** a consumer imports `DeboSceneGrid` from the components barrel
- **THEN** the component is available and renders correctly
