---
name: designbook-components
description: Create and maintain Designbook shared React components for Storybook MDX pages. Use when building display components, workflow sections, or extending the Debo* component library.
license: MIT
compatibility: Requires Storybook, React, Tailwind CSS v4, DaisyUI v5.
metadata:
  author: designbook
  version: "2.0"
---

Build and maintain the Designbook shared component library for Storybook MDX pages.

## Architecture

### Read-Only Display Principle

Storybook **never** provides write access. All data input happens through AI commands in the editor.

```
AI Command (input) → designbook/*.md (storage) → Storybook MDX (display)
```

- `GET /__designbook/load?path=<relative-path>` — reads files from `designbook/`
- `POST /__designbook/save` — writes files (used by AI commands only, never by Storybook UI)
- Vite plugin: `.storybook/source/vite-plugin-designbook-save.js`

### Component Library

- **Barrel exports**: `.storybook/source/components/index.js` — always check here for existing components before creating new ones
- **Shared base components** use the `Debo` prefix (e.g., `DeboCard`, `DeboSection`)
- **Workflow-specific components** keep descriptive names (e.g., `ProductOverviewCard`) and compose from `Debo*` base components
- **Hooks**: `.storybook/source/hooks/` — reusable React hooks (e.g., `useDesignbookData`)

## Global Component Rules

These rules apply to **every** component in `.storybook/source/`.

### 1. CSS Isolation — `debo:` Prefix

All Tailwind classes **MUST** use the `debo:` prefix. No exceptions.

```jsx
// ✅ Correct
<div className="debo:flex debo:gap-4 debo:p-6 debo:bg-base-100">

// ❌ Wrong — unprefixed classes will leak into Drupal/Twig scope
<div className="flex gap-4 p-6 bg-base-100">
```

- CSS entry point: `.storybook/source/index.css` → `@import "tailwindcss" prefix(debo);`
- Dark mode variant: `debo:dark:` (e.g., `debo:dark:bg-gray-800`)
- DaisyUI classes also use the `debo:` prefix (e.g., `debo:card`, `debo:btn`)
- Responsive variants: `debo:md:`, `debo:lg:`, etc.

### 2. Display-Only — No Write Operations

- **Never** add forms, editors, text inputs, or save buttons
- Components display data and reference AI commands — nothing more
- Empty states show which AI command to run (e.g., "Run `/product-vision` to get started")
- The only interactive elements allowed: collapse/expand toggles, reload buttons, navigation

### 3. Props-Based Data Flow

- All components receive data through **props** — no direct data fetching inside presentational components
- Data loading happens in container components or the `useDesignbookData` hook
- Parsers convert Markdown strings to structured data objects
- Components must handle `null`/empty data gracefully

### 4. Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Shared base component | `Debo<Name>.jsx` | `DeboCard.jsx`, `DeboSection.jsx` |
| Workflow-specific component | `<Descriptive>.jsx` | `ProductOverviewCard.jsx` |
| Hook | `use<Name>.js` | `useDesignbookData.js` |
| Parser | Exported function in component or separate file | `parseProductOverview()` |

### 5. File Size & Responsibility

- Each component file should be **< 50 lines** — single responsibility
- If a component grows, split it into smaller `Debo*` base components
- Compose complex UIs from small building blocks, don't create monoliths

### 6. Theme Support

- Every component must work in **both light and dark** themes
- Use DaisyUI semantic colors (`debo:bg-base-100`, `debo:text-base-content`) over hardcoded colors
- Only use `debo:dark:` overrides when semantic colors don't suffice
- Test both themes during validation

### 7. Composition Over Duplication

- Check `index.js` barrel exports before creating a new component — it might already exist
- Workflow-specific components should **compose** `Debo*` base components
- If you find repeated patterns across components, extract them into a new `Debo*` shared component

### 8. Export Registration

Every new component **MUST** be added to the barrel export at `.storybook/source/components/index.js`:

```js
// Shared base components (Debo*)
export { DeboNewComponent } from './DeboNewComponent.jsx';

// Workflow-specific components
export { MyWorkflowCard } from './MyWorkflowCard.jsx';
```

## File Structure

```
.storybook/
├── source/
│   ├── index.css                           # CSS entry: @import "tailwindcss" prefix(debo)
│   ├── vite.config.js                      # Independent Vite config for React components
│   ├── vite-plugin-designbook-save.js      # Vite middleware for file load/save
│   ├── components/
│   │   ├── index.js                        # Barrel exports (check before creating!)
│   │   ├── Debo*.jsx                       # Shared base components
│   │   └── <Workflow>*.jsx                 # Workflow-specific composed components
│   └── hooks/
│       └── useDesignbookData.js            # Data loading hook
├── onboarding/
│   └── *.mdx                              # MDX pages using components
```

## Creating a New Component

### Step 1: Check Existing Components

Read `.storybook/source/components/index.js` to see what already exists. Don't duplicate.

### Step 2: Create the Component File

Place in `.storybook/source/components/`. Follow naming conventions (see above).

```jsx
import React from 'react';

export function DeboNewThing({ title, children }) {
  return (
    <div className="debo:p-4 debo:bg-base-100 debo:rounded-lg">
      {title && <h3 className="debo:text-lg debo:font-semibold debo:text-base-content">{title}</h3>}
      {children}
    </div>
  );
}
```

Key checklist:
- [ ] All classes use `debo:` prefix
- [ ] Props-based, no internal data fetching (unless it's a container)
- [ ] Handles null/empty props gracefully
- [ ] Works in light and dark themes (semantic DaisyUI colors)
- [ ] < 50 lines, single responsibility
- [ ] No forms, editors, or save operations

### Step 3: Register in Barrel Export

Add to `.storybook/source/components/index.js`.

### Step 4: Use in MDX

```mdx
import { DeboNewThing } from '../source/components/index.js';
import '../source/index.css';

<DeboNewThing title="Hello">
  Content here...
</DeboNewThing>
```

## Creating a New Workflow Section

When adding a data-backed workflow section to an MDX page:

### Step 1: Create the AI Command

Create `.cursor/commands/<command-name>.md` with the conversational pattern:
- Gather input → Ask questions → Present draft → Confirm → Save file
- Output: `designbook/<area>/<filename>.md`

### Step 2: Create a Markdown Parser

Each workflow needs a parser that converts Markdown to structured data:

```jsx
export function parseMyData(md) {
  // Parse markdown string into structured data object
  // Return null if parsing fails or data is empty
}
```

### Step 3: Add DeboSection to MDX

Use the `DeboSection` component which handles the full data loading lifecycle (loading → error → empty → content):

```mdx
import { DeboSection, DeboNumberedList } from '../source/components/index.js';
import { parseMyData } from '../source/parsers/mydata.js';

<DeboSection
  dataPath="area/my-data.md"
  parser={parseMyData}
  command="/my-command"
  emptyMessage="No data defined yet"
  renderContent={(data) => <DeboNumberedList items={data.items} />}
/>
```

### Step 4: Validate

Verify in Storybook:
- Empty state shows AI command reference
- Data state displays loaded content correctly
- Reload button refreshes data
- Both light and dark themes work
- CSS isolation intact (no style leakage)
