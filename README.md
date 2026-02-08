# Designbook

**Designbook** is a framework-agnostic, Storybook-based design and workflow environment for structured product planning, design documentation, and component development.

## Target Audience

**Primary Users**: Designers and Product Planners
- Define product vision, roadmaps, and requirements
- Design data models and component specifications
- Document design systems and UI patterns
- Create screen designs and workflows

**Supporting Role**: Developers
- Ensure components are correctly generated from specifications
- Implement technical requirements defined by designers/planners
- Validate component functionality and integration

**Collaboration Model**: Designers and product planners do the main work defining *what* to build, while developers support by ensuring components are correctly implemented.

## Overview

Designbook leverages **Storybook's rendering capabilities** to work with any framework Storybook supports (React, Vue, Angular, Web Components, etc.). It combines structured **Design OS Workflows** with Storybook's powerful component documentation system to provide a comprehensive environment for:
- Product planning and documentation
- Design system management
- Component development and documentation (framework-agnostic)
- Data model definition

**Current Implementation**: While this repository uses Drupal Single Directory Components (SDC) with Twig templates, the Designbook workflow system is designed to work with any component framework that Storybook supports.

## Architecture

### Core Principle: Read-Only Display

Storybook serves exclusively for **display** – all data input happens via **AI commands** in the editor (Cursor):

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  Storybook   │     │   AI Command     │     │  designbook/      │
│  (display)   │◄────│   (input)        │────►│  (file storage)   │
│              │     │  e.g. /product-  │     │  e.g. product/    │
│  Shows data  │     │  vision          │     │  product-overview │
│  + AI cmd    │     │                  │     │  .md              │
│  reference   │     │  Conversational  │     │                   │
└──────┬───────┘     │  in editor       │     └───────────────────┘
       │             └──────────────────┘              ▲
       │                                               │
       └── loads via GET /__designbook/load ───────────┘
```

**Benefits:**
- AI commands provide richer, conversational experience than web forms
- Storybook focuses on its strength: rendering and display
- Markdown files are human-readable, git-trackable, and portable
- Clean separation of concerns: AI writes, Storybook reads

## Technology Stack

### Core (Framework-Agnostic)
- **Framework**: Storybook 9.1.12 with HTML/Vite
- **Rendering**: Storybook handles all component rendering (supports React, Vue, Angular, Web Components, etc.)
- **Workflow Components**: React components for interactive documentation and workflow UIs
- **CSS**: Tailwind CSS v4 + DaisyUI v5
- **Build**: Vite with custom plugins

### Current Implementation (Drupal)
- **Component System**: Drupal Single Directory Components (SDC)
- **Templates**: Twig templates for Drupal components
- **Addon**: `storybook-addon-sdc` for Drupal component integration

> **Note**: The Designbook workflow system (AI commands, data storage, MDX documentation) is completely independent of the component framework. You can use Designbook with React, Vue, Angular, Svelte, or any other framework Storybook supports.

## Project Structure

```
designbook/
├── .storybook/              # Storybook configuration (framework-agnostic)
│   ├── source/              # React components for MDX pages
│   │   ├── components/      # Reusable display components
│   │   └── vite-plugin-designbook-save.js  # Middleware for file access
│   └── onboarding/          # Onboarding MDX files
├── components/              # Your component library (framework-specific)
│                            # Current: Drupal Twig components (SDC)
│                            # Could be: React, Vue, Angular, etc.
├── designbook/              # Saved workflow data (Markdown, framework-agnostic)
│   ├── product/             # Product planning
│   ├── data-model/          # Data model definitions
│   ├── design-system/       # Design system documentation
│   └── design-shell/        # Design shell specifications
├── .cursor/commands/        # AI commands for data input (framework-agnostic)
├── source/design-os/        # Design OS reference implementation
└── agents.md                # Detailed project documentation
```

**Framework Flexibility**: The `components/` directory structure depends on your chosen framework. Designbook workflows (in `designbook/`, `.cursor/commands/`, and `.storybook/onboarding/`) remain the same regardless of your component framework.

## Workflow Areas

### 1. Product Planning
**Owner**: Product Planners
- **Product Vision** (`/product-vision`): Product description, problems/solutions, features
- **Product Roadmap** (`/product-roadmap`): Development roadmap and sections

### 2. Data Model
**Owner**: Designers & Product Planners
- **Data Model** (`/data-model`): Define core entities and relationships

### 3. Design System
**Owner**: Designers
- **Design Tokens** (`/design-tokens`): Color palettes and typography
- Integration with Tailwind/DaisyUI

### 4. Component Specification
**Owner**: Designers
**Support**: Developers (ensure correct component generation)
- **Section Specification** (`/shape-section`): Component requirements
- **Sample Data** (`/sample-data`): Sample data for components

### 5. Design Documentation
**Owner**: Designers
- **Screen Design** (`/design-screen`): UI designs and layouts
- **Screenshots** (`/screenshot-design`): Document design states

## Usage

### Development Build (Recommended)
This command runs both the **addon build watcher** and **Storybook** in parallel, ensuring that changes to the addon are immediately reflected in Storybook.

```bash
pnpm run dev
```

### Granular Commands
If you need to run processes separately:

- **Addon only** (watch mode):
  ```bash
  pnpm run dev:addon
  ```
- **Integration Storybook**:
  ```bash
  pnpm run dev:integration:drupal
  ```

### CSS Linting
```bash
pnpm run lint:css
pnpm run lint:css:fix
```

## CSS Isolation: Tailwind Prefix

To prevent CSS class collisions between Drupal components and React components, we use **Tailwind v4's `prefix()` feature**:

- **React components** (`.storybook/source/`): Use `debo:` prefix
  ```jsx
  <div className="debo:flex debo:gap-4 debo:p-6 debo:bg-white debo:dark:bg-gray-800">
  ```
- **Drupal/Twig components**: Use **unprefixed** classes
- **Dark mode** in React: `debo:dark:` variant

## AI Commands

All data input happens via AI commands in the editor:

- `/product-vision` – Define product vision
- `/product-roadmap` – Create roadmap
- `/data-model` – Define data model
- `/design-tokens` – Document design tokens
- More commands in `.cursor/commands/`

**Workflow:**
1. Run AI command in editor
2. Conversational data input
3. Confirmation and save as Markdown
4. Automatic display in Storybook

## Further Documentation

- **Detailed project documentation**: `agents.md`
- **Design OS reference**: `source/design-os/agents.md`
- **Storybook configuration**: `.storybook/main.js`

## License

Private project
