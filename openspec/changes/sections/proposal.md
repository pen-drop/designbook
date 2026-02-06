# Sections Page — shape-section Workflow

## Problem
The Design OS "shape-section" workflow for defining section specifications is not yet available in Designbook. Users need a way to systematically specify each roadmap section's user flows, UI requirements, and scope.

## Solution
Create a "Sections" Storybook page that loads the product roadmap, shows progress across all sections, and displays individual section specifications. Add a `/shape-section` AI command that guides users through defining each section's specification.

## Scope
- New Storybook page "Sections" at `.storybook/onboarding/sections.mdx`
- New React components: `SectionsOverview` (multi-file loader with progress), `SectionSpecCard` (individual spec display)
- New AI command `/shape-section` at `.cursor/commands/shape-section.md`
- Section specs stored at `designbook/sections/[section-id]/spec.md`
- Sidebar ordering updated to include Sections after Design System

## Out of Scope
- Sample data workflow (`/sample-data`) — future change
- Screen design workflow (`/design-screen`) — future change
- Screenshot capture workflow — future change
