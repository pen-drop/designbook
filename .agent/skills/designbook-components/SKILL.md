---
name: designbook-components
description: Create and maintain Designbook shared React components for Storybook MDX pages. Use when building display components, workflow sections, or extending the Debo* component library.
license: MIT
compatibility: Requires Storybook, React, Tailwind CSS v4, DaisyUI v5.
metadata:
  author: designbook
  version: "1.0"
---

Build and maintain the Designbook shared component library for Storybook MDX pages.

## Architecture

Designbook components live in `.storybook/source/` and follow these core principles:

### Storybook is Read-Only Display

- **No forms, no editors, no save buttons** in Storybook MDX pages
- Storybook pages display **references to AI commands** for data input
- Users run AI commands in their editor for conversational data entry
- Results are saved as **Markdown files** in `designbook/`
- Storybook **loads and displays** saved data via Vite plugin middleware

### Data Flow

```
AI Command (input) → designbook/*.md (storage) → Storybook MDX (display)
```

- `GET /__designbook/load?path=<relative-path>` — reads files from `designbook/`
- `POST /__designbook/save` — writes files to `designbook/`
- Vite plugin: `.storybook/source/vite-plugin-designbook-save.js`

### CSS Isolation

All components use **`debo:` prefixed Tailwind classes** (Designbook prefix):

```css
/* .storybook/source/index.css */
@import "tailwindcss" prefix(debo);
```

**Rules:**
- React components in `.storybook/source/` **MUST** use `debo:` prefixed classes exclusively
- Dark mode: `debo:dark:` variant (e.g., `debo:dark:bg-gray-800`)
- DaisyUI classes are also scoped under the `debo:` prefix
- Drupal/Twig components **MUST NOT** use `debo:` prefixed classes

## Shared Component Library (`Debo*`)

All shared base components use the `Debo` prefix. Workflow-specific components (like `ProductOverviewCard`) keep descriptive names and compose from `Debo*` base components.

### `DeboCard`

Card wrapper with consistent styling.

```jsx
<DeboCard title="Optional title">
  <p>Card content...</p>
</DeboCard>
```

**Props:**
- `title` (string, optional) — Card heading
- `children` — Card body content

**Styling:** `debo:card debo:bg-base-100 debo:border debo:border-base-300 debo:shadow-sm` + `debo:card-body`

### `DeboCollapsible`

Expandable/collapsible section with title, count badge, and chevron toggle.

```jsx
<DeboCollapsible title="Problems & Solutions" count={3}>
  <ul>...</ul>
</DeboCollapsible>
```

**Props:**
- `title` (string) — Section heading
- `count` (number, optional) — Badge showing item count
- `children` — Collapsible content
- `defaultOpen` (boolean, optional) — Initial open state

**Behavior:** Manages its own open/close state. Renders chevron icon that rotates on toggle.

### `DeboSection`

Page section that combines data loading, empty state, content rendering, reload, and AI command reference.

```jsx
<DeboSection
  title="Product Roadmap"
  dataPath="product/product-roadmap.md"
  parser={parseRoadmap}
  command="/product-roadmap"
  emptyMessage="No product roadmap defined yet"
  renderContent={(data) => <DeboNumberedList items={data.sections} />}
/>
```

**Props:**
- `title` (string) — Section display title
- `dataPath` (string) — Relative path within `designbook/` to load
- `parser` (function) — Markdown-to-data parser: `(markdownString) => parsedData | null`
- `command` (string) — AI command name (e.g., `/product-roadmap`)
- `emptyMessage` (string) — Displayed when no data exists
- `renderContent` (function) — `(parsedData) => JSX` — how to render the loaded data

**Behavior:** Uses `useDesignbookData` hook internally. Shows loading spinner → error alert → empty state with AI command reference → content with reload button and command reference footer.

### `DeboEmptyState`

Empty state display with AI command reference and instructions.

```jsx
<DeboEmptyState
  message="No product vision defined yet"
  command="/product-vision"
  filePath="designbook/product/product-overview.md"
/>
```

**Props:**
- `message` (string) — Main empty state heading
- `command` (string) — AI command to reference
- `filePath` (string, optional) — Where the data will be saved

### `DeboNumberedList`

Numbered list of items with title and description.

```jsx
<DeboNumberedList items={[
  { title: "Homepage", description: "Landing page with overview..." },
  { title: "About", description: "Company info and team..." },
]} />
```

**Props:**
- `items` (array) — `[{ title: string, description: string }]`

### `useDesignbookData` Hook

Custom React hook for the common fetch/parse/reload pattern.

```jsx
const { data, loading, error, reload } = useDesignbookData(
  'product/product-overview.md',
  parseProductOverview
);
```

**Parameters:**
- `path` (string) — Relative path within `designbook/`
- `parser` (function) — `(markdownString) => parsedData | null`

**Returns:**
- `data` — Parsed data or `null`
- `loading` (boolean) — Loading state
- `error` (string | null) — Error message
- `reload` (function) — Refetch and reparse data

## File Structure

```
.storybook/
├── source/
│   ├── index.css                           # CSS entry: @import "tailwindcss" prefix(debo)
│   ├── vite.config.js                      # Independent Vite config for React components
│   ├── vite-plugin-designbook-save.js      # Vite middleware for file load/save
│   ├── components/
│   │   ├── index.js                        # Barrel exports
│   │   ├── DeboCard.jsx                    # Card wrapper
│   │   ├── DeboCollapsible.jsx             # Expand/collapse section
│   │   ├── DeboSection.jsx                 # Full section with data loading
│   │   ├── DeboEmptyState.jsx              # Empty state with AI command ref
│   │   ├── DeboNumberedList.jsx            # Numbered list (roadmap, steps)
│   │   ├── ProductOverviewCard.jsx         # Composed from DeboCard + DeboCollapsible
│   │   └── ...                             # Future workflow-specific components
│   └── hooks/
│       └── useDesignbookData.js            # Data loading hook
├── onboarding/
│   ├── product-vision.mdx                  # Product page (vision + roadmap sections)
│   └── ...
```

## Creating a New Workflow Section

When adding a new workflow to an MDX page:

### Step 1: Create the AI Command

Create `.cursor/commands/<command-name>.md` with the conversational workflow pattern:
- Gather input → Ask questions → Present draft → Confirm → Save file
- Output: `designbook/<area>/<filename>.md`

### Step 2: Create a Markdown Parser

Each workflow needs a parser function that converts Markdown to structured data:

```jsx
export function parseRoadmap(md) {
  // Parse markdown into { sections: [{ title, description }] }
  // Return null if parsing fails
}
```

### Step 3: Add `DeboSection` to MDX

```mdx
import { parseRoadmap } from '../source/parsers/roadmap.js';

## Product Roadmap

<DeboSection
  dataPath="product/product-roadmap.md"
  parser={parseRoadmap}
  command="/product-roadmap"
  emptyMessage="No product roadmap defined yet"
  renderContent={(data) => <DeboNumberedList items={data.sections} />}
/>
```

### Step 4: Validate with Agent Browser

```bash
agent-browser open "http://localhost:6009/iframe.html?id=<page-id>--docs&viewMode=docs"
agent-browser snapshot
```

Verify:
- Empty state shows AI command reference
- Data state displays loaded content correctly
- Reload button refreshes data
- CSS isolation intact (no style leakage)

## Component Guidelines

- **Display-Only**: Components in Storybook MUST NOT save data — saving happens via AI commands only
- **Props-Based**: All components accept data via props (no direct imports of data)
- **`debo:` Prefix**: All Tailwind classes use `debo:` prefix for CSS isolation
- **Composable**: Use `Debo*` base components instead of inline implementations
- **Light/Dark**: Support both themes via `debo:dark:` variants
- **Small Files**: Each component <50 lines, single responsibility
- **No Write Operations**: Never add forms, editors, or save buttons to Storybook
