---
name: designbook-addon-components
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

- `GET /__designbook/load?path=<relative-path>` — reads files from the configured `dist` directory (default: `designbook/`)
- `POST /__designbook/save` — writes files (used by AI commands only, never by Storybook UI)
- Vite plugin: `packages/storybook-addon-designbook/src/vite-plugin.ts`

### Component Library

- **Barrel exports**: `packages/storybook-addon-designbook/src/components/index.js` — always check here for existing components before creating new ones
- **Shared base components** use the `Debo` prefix (e.g., `DeboCard`, `DeboSection`)
- **Display components** use the `Debo` prefix (e.g., `DeboProductOverview`) and compose from `Debo*` UI components
- **Hooks**: `packages/storybook-addon-designbook/src/hooks/` — reusable React hooks (e.g., `useDesignbookData`)

## Global Component Rules

These rules apply to **every** component in `packages/storybook-addon-designbook/src/`.

### 1. CSS Isolation — `debo:` Prefix

All Tailwind classes **MUST** use the `debo:` prefix. No exceptions.

```jsx
// ✅ Correct
<div className="debo:flex debo:gap-4 debo:p-6 debo:bg-base-100">

// ❌ Wrong — unprefixed classes will leak into Drupal/Twig scope
<div className="flex gap-4 p-6 bg-base-100">
```

- CSS entry point: `packages/storybook-addon-designbook/src/index.css`
- Build pipeline: Tailwind v4 CSS-first configuration with DaisyUI v5 plugin
- DaisyUI themes: `light` (default), `dark` (prefers-color-scheme)
- DaisyUI classes also use the `debo:` prefix (e.g., `debo:card`, `debo:btn`, `debo:alert`)
- Dark mode variant: `debo:dark:` (e.g., `debo:dark:bg-gray-800`)
- Responsive variants: `debo:md:`, `debo:lg:`, etc.

```css
/* packages/storybook-addon-designbook/src/index.css */
@import "tailwindcss" prefix(debo);
@plugin "daisyui" {
  themes: light --default, dark --prefersdark;
}
```

#### DaisyUI Component Mapping

| UI Pattern | DaisyUI Component | Classes |
|---|---|---|
| Cards | card | `debo:card debo:card-bordered debo:bg-base-100` |
| Collapse/Expand | collapse | `debo:collapse debo:collapse-arrow` |
| Buttons | btn | `debo:btn debo:btn-ghost debo:btn-xs` |
| Status dots | badge | `debo:badge debo:badge-xs debo:badge-success` |
| Spinners | loading | `debo:loading debo:loading-spinner` |
| Errors | alert | `debo:alert debo:alert-error` |
| Checkboxes | checkbox | `debo:checkbox debo:checkbox-sm` |
| Keyboard hints | kbd | `debo:kbd debo:kbd-xs` |
| Code blocks | mockup-code | `debo:mockup-code` |
| Lists | menu | `debo:menu debo:menu-lg` |

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
| Display component | `Debo<Name>.jsx` | `DeboProductOverview.jsx` |
| Hook | `use<Name>.js` | `useDesignbookData.js` |
| Parser | Exported function in component or separate file | `parseProductOverview()` |

### 5. File Size & Decomposition

- Each component file should be **< 50 lines** — single responsibility
- If a component grows, split it into smaller `Debo*` base components
- Compose complex UIs from small building blocks, don't create monoliths
- **Always extract sub-components**: When a UI component contains a visually distinct element (badge, tag, label, icon group, metadata row, etc.), extract it as its own `Debo*` component in a separate file. Never inline styled sub-elements that could be reused — every visual primitive gets its own component.

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

Every new component **MUST** be added to the barrel export at `packages/storybook-addon-designbook/src/components/index.js`:

```js
// Shared base components (Debo*)
export { DeboNewComponent } from './DeboNewComponent.jsx';

// Workflow-specific components
export { MyWorkflowCard } from './MyWorkflowCard.jsx';
```

## File Structure

```
packages/storybook-addon-designbook/
├── src/
│   ├── index.css                           # CSS entry: Tailwind v4 + DaisyUI v5 with prefix(debo)
│   ├── vite.config.js                      # Independent Vite config for React components
│   ├── vite-plugin.ts                      # Vite middleware for file load/save
│   ├── components/
│   │   ├── index.js                        # Barrel exports (check before creating!)
│   │   ├── Debo*.jsx                       # Shared base components
│   │   └── Debo<Workflow>*.jsx             # Workflow-specific composed components (MUST use Debo prefix)
│   └── hooks/
│       └── useDesignbookData.js            # Data loading hook
├── onboarding/
│   └── *.mdx                              # MDX pages using components
```

### Development & Build

```bash
# Start Storybook dev server
pnpm run dev

# Build CSS only (Tailwind + DaisyUI)
pnpm run build:css

# Full build
pnpm run build
```

## Creating a New Component

### Step 1: Check Existing Components

Read `packages/storybook-addon-designbook/src/components/index.js` to see what already exists. Don't duplicate.

### Step 2: Identify Sub-Components

Before writing code, decompose the design into visual primitives. Each distinct styled element should be its own `Debo*` component:

```
DeboCard (card container)
├── DeboBadge (colored label tag) ← separate file
├── DeboTag (metadata tag)        ← separate file if new pattern
└── inline layout only            ← stays in parent
```

**Rule**: If an element has its own background color, border, or typographic style that could appear elsewhere, it must be a separate `Debo*` component. Create sub-components **first**, then compose them in the parent.

### Step 3: Create the Component Files

Place in `packages/storybook-addon-designbook/src/components/ui/`. Follow naming conventions (see above).

```jsx
// DeboBadge.jsx — sub-component created first
export function DeboBadge({ children, color = 'rose', className = '' }) {
  const colors = { rose: 'debo:bg-rose-100 debo:text-rose-700', /* ... */ };
  return (
    <span className={`debo:uppercase debo:text-[10px] debo:font-bold debo:px-2 debo:py-0.5 debo:rounded ${colors[color]} ${className}`.trim()}>
      {children}
    </span>
  );
}

// DeboCard.jsx — parent composes sub-components
import { DeboBadge } from './DeboBadge.jsx';

export function DeboCard({ title, badge, children }) {
  return (
    <div className="debo:bg-white debo:rounded-lg debo:shadow-sm debo:p-5">
      <div className="debo:flex debo:items-start debo:justify-between">
        <h3 className="debo:text-lg debo:font-semibold debo:text-slate-800">{title}</h3>
        {badge && <DeboBadge>{badge}</DeboBadge>}
      </div>
      {children}
    </div>
  );
}
```

Key checklist:
- [ ] All classes use `debo:` prefix
- [ ] Visually distinct elements extracted as separate `Debo*` sub-components
- [ ] Props-based, no internal data fetching (unless it's a container)
- [ ] Handles null/empty props gracefully
- [ ] < 50 lines per file, single responsibility
- [ ] No forms, editors, or save operations

### Step 4: Register in Barrel Export

Add to `packages/storybook-addon-designbook/src/components/index.js`.

### Step 5: Use in MDX

```mdx
import { DeboNewThing } from '../components/index.js';
import '../index.css';

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
import { DeboSection, DeboNumberedList } from '../components/index.js';
import { parseMyData } from '../utils/parsers/mydata.js';

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
