---
description: Guide for migrating Design OS workflows to Designbook (Storybook MDX)
---

# Design OS Migration Skill

This skill contains reference material and strategies for migrating legacy "Design OS" workflows into the new Designbook Storybook-based architecture.

## Context

**Design OS** (`source/design-os/`) was the template and reference for structured product planning workflows. The goal is to adopt these workflows into MDX format for use within Designbook.

## Migration Strategy

### Goal
Transfer Design OS workflows into MDX format for use within Storybook, enabling structured product planning and design documentation directly in the Storybook environment.

### Approach: Gradual Piece-by-Piece Adoption

Rather than a complete migration, we're adopting Design OS workflows incrementally:

1. **Identify Workflow Components**: Extract specific workflows from Design OS that align with our needs
2. **Create AI Command**: Build a Cursor AI command in `.cursor/commands/` for conversational data input
3. **Define File Format**: Establish Markdown file structure in `designbook/` for saved data
4. **Create React Components**: Build display components in `packages/storybook-addon-designbook/src/components/` for rendering saved data
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

## Migration Principles

1. **Preserve Workflow Logic**: Maintain the structured, step-by-step approach from Design OS
2. **Adapt to Storybook**: Convert React-based UI to MDX documentation format with embedded React components
3. **React Component Migration**: Extract and adapt React components from Design OS to `packages/storybook-addon-designbook/src/components/` for use in MDX files
4. **Incremental Adoption**: Migrate one workflow area at a time
5. **Maintain Reference**: Keep `source/design-os/` as the source of truth for original workflows
6. **Document Decisions**: Record migration decisions and adaptations in MDX comments or documentation

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
