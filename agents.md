# Agent Directives for Designbook

## Project Overview

**Designbook** is the product name for our framework-agnostic, Storybook-based design and workflow environment. It provides a **Storybook workflow** that works with any component framework Storybook supports.

**Target Audience**: Designbook primarily targets **designers and product planners** who define the "what" of the product. Developers play a **supporting role** to ensure components are correctly generated from specifications.

**Collaboration Model**:
- **Designers & Product Planners**: Own the main workflows (product vision, data models, design systems, component specs, screen designs)
- **Developers**: Support by ensuring technical correctness, component generation, and implementation validation

**Framework Flexibility**: Designbook leverages Storybook's powerful rendering capabilities to work with React, Vue, Angular, Web Components, Svelte, or any other framework Storybook supports. The workflow system (AI commands, data storage, MDX documentation) is completely independent of your component framework choice.

**Current Implementation**: This repository currently uses Drupal Single Directory Components (SDC) with Twig templates as the **first integration deployment**. The same Designbook workflow system applies to any Storybook-supported framework. React, Vue, Svelte, and others will follow and land under `packages/integrations/` for testing.

## Current Setup

### Storybook Environment (Framework-Agnostic Core)
- **Framework**: Storybook 9.1.12 with HTML/Vite
- **Rendering**: Storybook handles all component rendering (framework-agnostic)
- **Documentation**: MDX files supported in `.storybook/onboarding/` and `foundations/`
- **React Components**: Storybook also supports React components for interactive documentation and workflow UIs
- **Monorepo Structure**:
  - `packages/storybook-addon-designbook/`: Core addon with React components and logic (Framework Agnostic)
  - `packages/integrations/`: Integration packages for various frameworks
    - `test-integration-drupal`: Current Drupal SDC integration example
    - *Future*: `test-integration-react`, `test-integration-vue`, etc. will be added here for testing.
- **Key Locations**:
  - `packages/storybook-addon-designbook/src/components`: React components (Debo*)
  - `packages/storybook-addon-designbook/src/onboarding`: Onboarding MDX files
  - `packages/storybook-addon-designbook/src/hooks`: React hooks
  - `packages/storybook-addon-designbook/src/index.css`: Core styles

### Current Component Implementation (Drupal-Specific)
- **Component System**: Drupal Single Directory Components (SDC) using YAML definitions
- **Templates**: Twig templates for component rendering
- **Addon**: `storybook-addon-sdc` for Drupal component integration
- **Components Location**: `components/` directory with `.component.yml` and `.story.yml` files

> **Important**: The component system shown above is specific to this Drupal implementation. If you're using Designbook with React, Vue, or another framework, your `components/` directory structure will differ, but the Designbook workflow system remains identical.

## Architecture Principles

### Storybook is Read-Only Display

**Storybook does NOT provide write access or data input forms.** This is a core architectural principle for all Designbook workflows.

- **No forms, no editors, no save buttons** in Storybook MDX pages
- Storybook pages display **references to AI commands** (e.g., `/product-vision`) for data input
- Users run AI commands in their editor (Cursor) for conversational, guided data entry
- Results are saved as **Markdown files** in the `designbook/` directory
- Storybook **loads and displays** saved data via Vite plugin middleware

### Storybook Handles All Rendering

**Storybook's rendering engine is framework-agnostic.** This is what makes Designbook flexible.

- Storybook can render components from **any supported framework** (React, Vue, Angular, Web Components, Svelte, etc.)
- The Designbook workflow system (AI commands, MDX documentation, data storage) is **completely independent** of your component framework
- Whether you use Drupal Twig, React, Vue, or any other framework, the Designbook workflows remain the same
- You can even mix multiple frameworks in the same Storybook instance

### Data Flow Pattern

All Designbook workflows follow this pattern:

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  Storybook   │     │   AI Command     │     │  designbook/      │
│  (display)   │◄────│   (input)        │────►│  (file storage)   │
│              │     │  e.g. /product-  │     │  e.g. product/    │
│  Shows data  │     │  vision          │     │  product-overview  │
│  + AI cmd    │     │                  │     │  .md              │
│  reference   │     │  Conversational  │     │                   │
└──────┬───────┘     │  workflow in     │     └───────────────────┘
       │             │  Cursor editor   │              ▲
       │             └──────────────────┘              │
       │                                               │
       └── loads via GET /__designbook/load ───────────┘
```

**Why this pattern:**
- AI commands provide a richer, conversational experience than web forms
- Storybook stays focused on its strength: rendering and display
- Markdown files are human-readable, git-trackable, and portable
- Clean separation of concerns: AI writes, Storybook reads

### Vite Plugin Middleware

The Vite plugin at `.storybook/source/vite-plugin-designbook-save.js` provides server-side file access:
- `GET /__designbook/load?path=<relative-path>` — reads files from `designbook/`
- `POST /__designbook/save` — writes files to `designbook/` (used by AI commands only)
- Returns 404 for missing files (triggers empty state in Storybook)

### AI Commands

AI commands are defined in `.cursor/commands/` and handle all data input:
- `/product-vision` — Define or update product vision → saves to `designbook/product/product-overview.md`
- Future: `/product-roadmap`, `/data-model`, etc.

Each AI command follows a conversational pattern: gather input → ask questions → present draft → confirm → save file.

## Core Workflows

The following workflow areas are core to Designbook:

### 1. Product Planning Workflows
**Owner**: Product Planners
- **Product Vision** (`/product-vision`): Define product description, problems/solutions, key features
- **Product Roadmap** (`/product-roadmap`): Break product into development sections
- **Output Format**: MDX documentation pages in Storybook

### 2. Data Model Definition
**Owner**: Designers & Product Planners
- **Data Model** (`/data-model`): Define core entities and relationships
- **Output Format**: MDX documentation with structured data model definitions

### 3. Design System Documentation
**Owner**: Designers
- **Design Tokens** (`/design-tokens`): Color palette and typography definitions
- **Integration**: Link to existing Tailwind/DaisyUI design tokens
- **Output Format**: MDX pages documenting design system decisions

### 4. Component Specification Workflows
**Owner**: Designers
**Support**: Developers (ensure correct component generation)
- **Section Specification** (`/shape-section`): Define component requirements
- **Sample Data** (`/sample-data`): Create sample data for components
- **Output Format**: MDX documentation accompanying component stories

### 5. Design Documentation
**Owner**: Designers
- **Screen Design** (`/design-screen`): Document UI designs and layouts
- **Screenshots** (`/screenshot-design`): Capture and document design states
- **Output Format**: MDX pages with embedded images and design documentation

## Integration Points

### Storybook Configuration
- **Main Config**: Defined in integration packages (e.g. `packages/integrations/test-integration-drupal/.storybook/main.js`)
- **Addon**: `storybook-addon-designbook` is added to the addons list

### MDX Documentation Structure
When creating MDX files for workflows:
- Place onboarding/workflow MDX files in `.storybook/onboarding/` or `foundations/`
- Use Storybook's MDX syntax for interactive documentation
- **Embed React Components**: Import and use React components from the addon within MDX files
- Link to component stories and documentation
- Maintain consistency with existing Storybook documentation patterns

### React Components for Workflows
- **Source Location**: `packages/storybook-addon-designbook/src/components/`
- **Purpose**: Interactive UI elements for workflow documentation (forms, wizards, step indicators, etc.)
- **Naming**: All components exported from here are prefixed with `Debo` (e.g., `DeboProductOverviewCard`) to avoid conflicts.
- **Integration**: Imported from the addon package in MDX files:
  ```javascript
  import { DeboProductOverviewCard } from 'storybook-addon-designbook';
  ```

## Design System Context

### Current Stack
- **CSS Framework**: Tailwind CSS v4
- **Component Library**: DaisyUI v5
- **Build Tool**: Vite
- **Theme System**: Light/Dark theme support via `data-theme` attribute

## Setup & Installation

### Package Manager
We use **pnpm** for dependency management. If you don't have it installed:

```bash
npm install -g pnpm
```

### Agent Browser
The "Agent Browser" referenced in verification steps is a tool used by the AI agent to validate the application. You do not need to install it. To verify the application yourself, simply run Storybook:

```bash
pnpm run storybook
```

## CSS Isolation: Tailwind Prefix

To prevent CSS class collisions between original Storybook/Drupal components and the new Designbook React components, we use **Tailwind CSS v4's `prefix()` feature**.

**How it works:**
- The addon CSS (`packages/storybook-addon-designbook/src/index.css`) imports Tailwind with a prefix:
  ```css
  @import "tailwindcss" prefix(debo);
  ```
- All React components in the addon use `debo:` prefixed utility classes:
  ```jsx
  <div className="debo:flex debo:gap-4 debo:p-6 debo:bg-white debo:dark:bg-gray-800">
  ```
- The integration project CSS (e.g. `packages/integrations/test-integration-drupal/css/app.src.css`) continues to use **unprefixed** Tailwind classes for Drupal/Twig components

**Rules:**
- React components in the addon **MUST** use `debo:` prefixed classes exclusively
- Drupal/Twig components **MUST NOT** use `debo:` prefixed classes
- Dark mode in React components uses `debo:dark:` variant (e.g., `debo:dark:bg-gray-800`)
- DaisyUI classes in React components are also scoped under the `debo:` prefix

**Why prefix over Shadow DOM:**
- Zero runtime overhead — purely build-time class name convention
- Works seamlessly with DaisyUI and Storybook's theme system
- No need to duplicate `data-theme` attribute into Shadow roots
- Simpler to implement, debug, and maintain

## File Locations

- **Storybook Addon**: `packages/storybook-addon-designbook/`
- **React Components Source**: `packages/storybook-addon-designbook/src/components/`
- **MDX Files**: `packages/storybook-addon-designbook/src/onboarding/`
- **Vite Plugin**: Managed internally by the addon
- **Integrations**: `packages/integrations/` (e.g. `test-integration-drupal`)
- **AI Commands**: `.cursor/commands/` - Conversational AI commands for data input
- **Designbook Data**: `designbook/` - Saved workflow data (Markdown files, git-tracked)
- **Components**: `components/` - Drupal Twig components
- **Documentation**: `.storybook/onboarding/`, `foundations/`
- **This File**: `agents.md` (project root)

## Usage Guidelines

When working on workflow definition tasks:

1. **Create AI Command First**: Build a Cursor AI command in `.cursor/commands/` for conversational data input — Storybook never has write access
2. **Define File Format**: Establish the Markdown file structure for `designbook/` output
3. **Extract Display Components**: Identify React components needed to display saved data (not for input)
4. **Create React Components**: Build display-only components in `packages/storybook-addon-designbook/src/components/` for Storybook MDX context
5. **Create MDX Page**: Build Storybook page showing AI command reference + loading/displaying saved data
6. **No Forms in Storybook**: Never add data input forms, editors, or save buttons to Storybook pages
7. **Test in Storybook**: Verify MDX files and embedded React components render correctly in Storybook
8. **Validate with Agent Browser**: Use the Agent Browser tool to validate data display, empty states, reload functionality, and theme switching
9. **Document Changes**: Note any adaptations made for the Storybook context
10. **Iterate**: Refine based on usage and feedback

## React Components in MDX

### Structure
```
packages/storybook-addon-designbook/
├── src/
│   ├── components/            # Reusable React components (Debo*)
│   │   ├── DeboStepIndicator.jsx
│   │   ├── DeboProductOverviewCard.jsx
│   │   └── ...
│   ├── hooks/                 # React hooks (useDesignbookData)
│   ├── onboarding/            # Onboarding MDX files
│   └── index.css              # Addon styles (debo: prefix)
├── dist/                      # Built artifacts
└── package.json

```

### Example MDX Usage (Read-Only Display Pattern)
```mdx
import { useState, useEffect } from 'react';
import { DeboProductOverviewCard } from '../components/index.js'; // Internal import in addon context
// or
// import { DeboProductOverviewCard } from 'storybook-addon-designbook'; // In integration context


export function ProductVisionDisplay() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/__designbook/load?path=product/product-overview.md')
      .then(res => res.ok ? res.text() : null)
      .then(md => { /* parse and setData */ });
  }, []);
  
  if (!data) return <p>Run <code>/product-vision</code> to get started.</p>;
  return <ProductOverviewCard overview={data} />;
}

---

<ProductVisionDisplay />
```

### Component Guidelines
- **Display-Only in Storybook**: React components in MDX pages are for displaying data, not capturing input
- **Props-Based**: All React components accept data via props (no direct imports of data)
- **Storybook-Compatible**: Components work within Storybook's MDX context
- **Design System**: Use `debo:` prefixed Tailwind/DaisyUI classes for CSS isolation
- **Accessibility**: Follow accessibility best practices for interactive components
- **No Write Operations**: Components in Storybook MUST NOT save data — saving happens via AI commands only

### Validation with Agent Browser

When validating workflows and components:

- **Use Agent Browser**: Always use the Agent Browser tool to validate the final implementation
- **Verify Rendering**: Check that MDX pages and React components render correctly in Storybook
- **Test Interactions**: Validate that form components, step indicators, and interactive elements function as expected
- **Theme Testing**: Verify that workflows adapt correctly to light and dark themes
- **User Experience**: Confirm that the workflow experience matches the requirements and provides a smooth user journey
- **Component Functionality**: Test that all React components accept props correctly and handle user interactions properly

The Agent Browser provides a reliable way to verify that the workflows work correctly in the actual Storybook environment.
