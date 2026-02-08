# Agent Directives for Designbook

## Project Overview

**Designbook** is the product name for our framework-agnostic, Storybook-based design and workflow environment. It migrates **Design OS workflows** into a **Storybook workflow** that works with any component framework Storybook supports.

**Target Audience**: Designbook primarily targets **designers and product planners** who define the "what" of the product. Developers play a **supporting role** to ensure components are correctly generated from specifications.

**Collaboration Model**:
- **Designers & Product Planners**: Own the main workflows (product vision, data models, design systems, component specs, screen designs)
- **Developers**: Support by ensuring technical correctness, component generation, and implementation validation

**Framework Flexibility**: Designbook leverages Storybook's powerful rendering capabilities to work with React, Vue, Angular, Web Components, Svelte, or any other framework Storybook supports. The workflow system (AI commands, data storage, MDX documentation) is completely independent of your component framework choice.

**Current Implementation**: This repository currently uses Drupal Single Directory Components (SDC) with Twig templates, but the same Designbook workflow system can be applied to any Storybook-supported framework.

Design OS (located in `source/design-os/`) serves as the template and reference for structured product planning, design, and documentation workflows. The goal is to gradually adopt these workflows piece by piece into MDX format so they can be used within Storybook as part of Designbook.

## Current Setup

### Storybook Environment (Framework-Agnostic Core)
- **Framework**: Storybook 9.1.12 with HTML/Vite
- **Rendering**: Storybook handles all component rendering (framework-agnostic)
- **Documentation**: MDX files supported in `.storybook/onboarding/` and `foundations/`
- **React Components**: Storybook also supports React components for interactive documentation and workflow UIs
- **React Source Location**: `.storybook/source/` - React components used in onboarding MDX files

### Current Component Implementation (Drupal-Specific)
- **Component System**: Drupal Single Directory Components (SDC) using YAML definitions
- **Templates**: Twig templates for component rendering
- **Addon**: `storybook-addon-sdc` for Drupal component integration
- **Components Location**: `components/` directory with `.component.yml` and `.story.yml` files

> **Important**: The component system shown above is specific to this Drupal implementation. If you're using Designbook with React, Vue, or another framework, your `components/` directory structure will differ, but the Designbook workflow system remains identical.

### Design OS Reference
- **Location**: `source/design-os/`
- **Purpose**: Template and reference for structured product planning workflows
- **Structure**: React-based application with guided workflows for:
  - Product vision and roadmap definition
  - Data model design
  - Design system tokens
  - Section specifications
  - Screen design components
  - Export packages

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

## Migration Strategy

### Goal
Transfer Design OS workflows into MDX format for use within Storybook, enabling structured product planning and design documentation directly in the Storybook environment.

### Approach: Gradual Piece-by-Piece Adoption

Rather than a complete migration, we're adopting Design OS workflows incrementally:

1. **Identify Workflow Components**: Extract specific workflows from Design OS that align with our needs
2. **Create AI Command**: Build a Cursor AI command in `.cursor/commands/` for conversational data input
3. **Define File Format**: Establish Markdown file structure in `designbook/` for saved data
4. **Create React Components**: Build display components in `.storybook/source/` for rendering saved data
5. **Create MDX Page**: Build Storybook page that shows AI command reference + loads/displays saved data
6. **Integrate into Storybook**: Add MDX files to Storybook's documentation structure
7. **Iterate and Refine**: Test each piece in the Storybook context and refine as needed

### Workflow Areas to Migrate

Based on Design OS structure (`source/design-os/agents.md`), the following workflow areas are candidates for migration:

#### 1. Product Planning Workflows
**Owner**: Product Planners
- **Product Vision** (`/product-vision`): Define product description, problems/solutions, key features
- **Product Roadmap** (`/product-roadmap`): Break product into development sections
- **Output Format**: MDX documentation pages in Storybook

#### 2. Data Model Definition
**Owner**: Designers & Product Planners
- **Data Model** (`/data-model`): Define core entities and relationships
- **Output Format**: MDX documentation with structured data model definitions

#### 3. Design System Documentation
**Owner**: Designers
- **Design Tokens** (`/design-tokens`): Color palette and typography definitions
- **Integration**: Link to existing Tailwind/DaisyUI design tokens
- **Output Format**: MDX pages documenting design system decisions

#### 4. Component Specification Workflows
**Owner**: Designers
**Support**: Developers (ensure correct component generation)
- **Section Specification** (`/shape-section`): Define component requirements
- **Sample Data** (`/sample-data`): Create sample data for components
- **Output Format**: MDX documentation accompanying component stories

#### 5. Design Documentation
**Owner**: Designers
- **Screen Design** (`/design-screen`): Document UI designs and layouts
- **Screenshots** (`/screenshot-design`): Capture and document design states
- **Output Format**: MDX pages with embedded images and design documentation

## Design OS Workflow Reference

When working on migration tasks, refer to `source/design-os/agents.md` for:
- Complete workflow definitions
- File structure patterns
- Design requirements and guidelines
- Export and handoff processes

## Current Component Structure (Drupal-Specific)

Our current Drupal components follow this pattern:
```
components/
└── [component-name]/
    ├── [component-name].component.yml    # Component definition (props, variants, slots)
    ├── [component-name].[variant].story.yml  # Story definitions
    └── [component-name].twig             # Twig template
```

> **Note**: This structure is specific to Drupal SDC. If you're using Designbook with React, Vue, or another framework, your component structure will follow that framework's conventions. The Designbook workflow system adapts to any component structure Storybook supports.

## Integration Points

### Storybook Configuration
- **Main Config**: `.storybook/main.js` - Configured to load MDX files from:
  - `./onboarding/*.mdx`
  - `../foundations/**/*.mdx`
  - Component YAML files
- **Preview Config**: `.storybook/preview.js` - Theme support and autodocs enabled

### MDX Documentation Structure
When creating MDX files for Design OS workflows:
- Place onboarding/workflow MDX files in `.storybook/onboarding/` or `foundations/`
- Use Storybook's MDX syntax for interactive documentation
- **Embed React Components**: Import and use React components from `.storybook/source/` within MDX files
- Link to component stories and documentation
- Maintain consistency with existing Storybook documentation patterns

### React Components for Workflows
- **Source Location**: `.storybook/source/` - All React components used in onboarding MDX files
- **Purpose**: Interactive UI elements for workflow documentation (forms, wizards, step indicators, etc.)
- **Integration**: React components are imported and used directly in MDX files
- **Pattern**: Mirror Design OS React components (`source/design-os/src/components/`) but adapt for Storybook MDX context
- **Examples**: 
  - Workflow step indicators
  - Interactive forms for product planning
  - Data model visualization components
  - Design system token displays

## Design System Context

### Current Stack
- **CSS Framework**: Tailwind CSS v4
- **Component Library**: DaisyUI v5
- **Build Tool**: Vite
- **Theme System**: Light/Dark theme support via `data-theme` attribute

### Design OS Design System
- **Reference**: `source/design-os/src/lib/design-system-loader.ts`
- **Tokens**: Color palettes and typography definitions
- **Integration**: Align Design OS design tokens with our Tailwind/DaisyUI setup

### CSS Isolation: Tailwind Prefix

To prevent CSS class collisions between original Storybook/Drupal components and the new Design OS React components, we use **Tailwind CSS v4's `prefix()` feature**.

**How it works:**
- The CSS entry point at `.storybook/source/` imports Tailwind with a prefix:
  ```css
  @import "tailwindcss" prefix(debo);
  ```
- All React components in `.storybook/source/` use `debo:` prefixed utility classes:
  ```jsx
  <div className="debo:flex debo:gap-4 debo:p-6 debo:bg-white debo:dark:bg-gray-800">
  ```
- The main project CSS (`css/app.src.css`) continues to use **unprefixed** Tailwind classes for Drupal/Twig components

**Rules:**
- React components in `.storybook/source/` **MUST** use `debo:` prefixed classes exclusively
- Drupal/Twig components **MUST NOT** use `debo:` prefixed classes
- Dark mode in React components uses `debo:dark:` variant (e.g., `debo:dark:bg-gray-800`)
- DaisyUI classes in React components are also scoped under the `debo:` prefix

**Why prefix over Shadow DOM:**
- Zero runtime overhead — purely build-time class name convention
- Works seamlessly with DaisyUI and Storybook's theme system
- No need to duplicate `data-theme` attribute into Shadow roots
- Simpler to implement, debug, and maintain

## Migration Principles

1. **Preserve Workflow Logic**: Maintain the structured, step-by-step approach from Design OS
2. **Adapt to Storybook**: Convert React-based UI to MDX documentation format with embedded React components
3. **React Component Migration**: Extract and adapt React components from Design OS to `.storybook/source/` for use in MDX files
4. **Incremental Adoption**: Migrate one workflow area at a time
5. **Maintain Reference**: Keep `source/design-os/` as the source of truth for original workflows
6. **Document Decisions**: Record migration decisions and adaptations in MDX comments or documentation

## File Locations

- **Design OS Reference**: `source/design-os/`
- **Design OS Agents**: `source/design-os/agents.md`
- **Storybook Config**: `.storybook/main.js`, `.storybook/preview.js`
- **React Components Source**: `.storybook/source/` - Display components for onboarding MDX files
- **Vite Plugin**: `.storybook/source/vite-plugin-designbook-save.js` - Middleware for file loading
- **Onboarding MDX Files**: `.storybook/onboarding/*.mdx` - Read-only display pages with AI command references
- **AI Commands**: `.cursor/commands/` - Conversational AI commands for data input
- **Designbook Data**: `designbook/` - Saved workflow data (Markdown files, git-tracked)
- **Components**: `components/` - Drupal Twig components
- **Documentation**: `.storybook/onboarding/`, `foundations/`
- **This File**: `agents.md` (project root)

## Usage Guidelines

When working on migration tasks:

1. **Reference Design OS**: Always check `source/design-os/agents.md` for original workflow definitions
2. **Create AI Command First**: Build a Cursor AI command in `.cursor/commands/` for conversational data input — Storybook never has write access
3. **Define File Format**: Establish the Markdown file structure for `designbook/` output
4. **Extract Display Components**: Identify React components needed to display saved data (not for input)
5. **Create React Components**: Build display-only components in `.storybook/source/` for Storybook MDX context
6. **Create MDX Page**: Build Storybook page showing AI command reference + loading/displaying saved data
7. **No Forms in Storybook**: Never add data input forms, editors, or save buttons to Storybook pages
8. **Test in Storybook**: Verify MDX files and embedded React components render correctly in Storybook
9. **Validate with Agent Browser**: Use the Agent Browser tool to validate data display, empty states, reload functionality, and theme switching
10. **Document Changes**: Note any adaptations made for the Storybook context
11. **Iterate**: Refine based on usage and feedback

## React Components in MDX

### Structure
```
.storybook/
├── source/                    # React components source
│   ├── components/            # Reusable React components
│   │   ├── WorkflowStep.tsx
│   │   ├── ProductForm.tsx
│   │   └── ...
│   └── utils/                 # Utility functions
├── onboarding/               # Onboarding MDX files
│   ├── welcome.mdx           # Uses React components from source/
│   └── product-vision.mdx
└── ...
```

### Example MDX Usage (Read-Only Display Pattern)
```mdx
import { useState, useEffect } from 'react';
import { ProductOverviewCard } from '../source/components/index.js';
import '../source/index.css';

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

When validating migrated workflows and components:

- **Use Agent Browser**: Always use the Agent Browser tool to validate the final implementation
- **Verify Rendering**: Check that MDX pages and React components render correctly in Storybook
- **Test Interactions**: Validate that form components, step indicators, and interactive elements function as expected
- **Theme Testing**: Verify that workflows adapt correctly to light and dark themes
- **User Experience**: Confirm that the workflow experience matches the requirements and provides a smooth user journey
- **Component Functionality**: Test that all React components accept props correctly and handle user interactions properly

The Agent Browser provides a reliable way to verify that the migrated workflows work correctly in the actual Storybook environment before considering the migration complete.

## Next Steps

As workflows are migrated:
- Document each migrated workflow in this file
- Extract and adapt React components from Design OS to `.storybook/source/`
- Create MDX templates for common workflow patterns with React component integration
- Establish conventions for workflow documentation structure
- Update Storybook configuration if needed to support React components in MDX
