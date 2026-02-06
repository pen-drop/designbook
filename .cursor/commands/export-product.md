---
name: /export-product
id: export-product
category: Designbook
description: Package the product plan for implementation
---

Package all Designbook artifacts into a self-contained export directory that can be used in a separate implementation project. The result is saved to `designbook/export/product-plan/`.

**Steps**

## Step 1: Check Prerequisites

Check if the following files exist:
- `designbook/product/product-overview.md` — product vision (required)
- `designbook/product/product-roadmap.md` — roadmap sections (required)
- `designbook/data-model/data-model.md` — data model (recommended)
- `designbook/design-system/design-tokens.md` — design tokens (recommended)
- `designbook/design-shell/shell-spec.md` — application shell (recommended)

Also check for section artifacts:
- For each section in the roadmap, check for: `spec.md`, `data.json`, `screen-designs.md`, `screenshots.md`

**If product vision or roadmap are missing**, tell the user:

> "Before exporting, you need at minimum:
> 1. `/product-vision` — Define your product
> 2. `/product-roadmap` — Define your sections"

Stop here.

Present a summary of what's available:

> "Ready to export **[Product Name]**:
>
> **Core artifacts:**
> - ✓/✗ Product Overview
> - ✓/✗ Product Roadmap ([N] sections)
> - ✓/✗ Data Model
> - ✓/✗ Design System
> - ✓/✗ Application Shell
>
> **Sections:**
> - [Section 1]: Spec ✓/✗, Data ✓/✗, Designs ✓/✗, Screenshots ✓/✗
> - [Section 2]: ...
>
> [N] warnings (missing recommended items)
>
> Proceed with export?"

Wait for confirmation.

## Step 2: Generate Product Overview Document

Create `designbook/export/product-plan/product-overview.md`:
- Include the product name, description, problems/solutions, and key features from the product vision
- Include the roadmap sections list
- Include the data model summary
- Write it as a comprehensive product brief

## Step 3: Generate Implementation Instructions

Create incremental milestone files in `designbook/export/product-plan/instructions/incremental/`:

**Milestone 01: Foundation** (`01-foundation.md`):
- Project setup (framework, dependencies)
- Design system integration (colors, typography, fonts)
- Data model setup (types, interfaces)
- Application shell implementation
- Base layout and routing

**Milestone 02+: Per Section** (`02-[section-id].md`, `03-[section-id].md`, etc.):
- Section overview and requirements
- Component structure
- Data integration
- User flows to implement
- UI requirements to satisfy
- Reference to screen designs and screenshots

Also create `designbook/export/product-plan/instructions/one-shot-instructions.md` combining all milestones.

## Step 4: Generate Prompts

Create `designbook/export/product-plan/prompts/one-shot-prompt.md`:
- A single, comprehensive prompt for an AI coding agent
- References all instruction files
- Includes project setup and implementation order

Create `designbook/export/product-plan/prompts/section-prompt.md`:
- A template prompt for implementing a single section
- Placeholder for section name and references
- Includes section-specific instructions

## Step 5: Copy Design System

Create `designbook/export/product-plan/design-system/`:
- `tokens.css` — CSS custom properties for colors and typography
- `tailwind-colors.md` — Color definitions for Tailwind config
- `fonts.md` — Font setup instructions (Google Fonts links, font-family values)

Generate these from `designbook/design-system/design-tokens.md`.

## Step 6: Copy Data Model

Create `designbook/export/product-plan/data-model/`:
- `README.md` — Entity descriptions and relationships
- `types.ts` — TypeScript interfaces for all entities
- `sample-data.json` — Combined sample data from all sections

Generate from `designbook/data-model/data-model.md` and section `data.json` files.

## Step 7: Copy Shell

Create `designbook/export/product-plan/shell/`:
- `README.md` — Shell specification (layout, navigation, responsive behavior)

Copy from `designbook/design-shell/shell-spec.md`.

## Step 8: Copy Section Artifacts

For each section, create `designbook/export/product-plan/sections/[section-id]/`:
- `README.md` — Section specification
- `tests.md` — Test instructions based on user flows
- `sample-data.json` — Section sample data (if exists)
- `screen-designs.md` — Screen design descriptions (if exists)

Generate test instructions from section specs:
- One test per user flow
- Include empty state tests
- Include responsive tests
- Framework-agnostic (describe expected behavior, not implementation)

## Step 9: Generate README

Create `designbook/export/product-plan/README.md`:
- Quick start guide
- Directory structure overview
- How to use (incremental vs one-shot)
- Links to key files

## Step 10: Confirm Completion

> "I've generated the export package at `designbook/export/product-plan/`.
>
> **Package contents:**
> - Product overview
> - [N] implementation milestones
> - 2 ready-to-use prompts
> - Design system tokens
> - Data model with types
> - Shell specification
> - [N] section packages with test instructions
>
> **Directory structure:**
> ```
> product-plan/
> ├── README.md
> ├── product-overview.md
> ├── prompts/
> ├── instructions/
> ├── design-system/
> ├── data-model/
> ├── shell/
> └── sections/
> ```
>
> Copy the `product-plan/` folder into your implementation project and follow the README to get started.
>
> Open Storybook to see the export status on the Export page."

**Guardrails**
- Never include implementation code — this is a design/specification package
- Instructions should be technology-agnostic where possible
- Prompts should work with any AI coding agent (Claude, GPT, etc.)
- Test instructions should describe behavior, not implementation
- Include all available artifacts even if some are incomplete
- Clearly mark missing items in the README
- Each milestone should be self-contained and independently implementable
- The export directory should be git-friendly (no binary files except screenshots)
