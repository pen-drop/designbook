# Sections Page — Design

## Architecture

### Multi-File Loading Pattern
Unlike other Designbook pages that load a single file, the Sections page loads:
1. The roadmap (`designbook/product/product-roadmap.md`) to get section list
2. For each section, tries to load `designbook/sections/[section-id]/spec.md`

This is handled by the `SectionsOverview` component which encapsulates all loading logic.

### Section ID Convention
Section IDs are derived from roadmap titles using kebab-case:
- "Homepage" → "homepage"
- "About & Team" → "about-team"
- "Blog & Contact" → "blog-contact"

### File Structure
```
designbook/sections/
├── homepage/
│   └── spec.md
├── services/
│   └── spec.md
├── portfolio/
│   └── spec.md
├── about-team/
│   └── spec.md
└── blog-contact/
    └── spec.md
```

### Components
- `SectionsOverview` — Self-contained component that loads roadmap + specs, renders progress overview and individual section cards
- `SectionSpecCard` — Displays a single section spec (title, overview, user flows, UI requirements, shell config)

### Spec Format
```markdown
# [Section Title] Specification

## Overview
[Description]

## User Flows
- [Flow descriptions]

## UI Requirements
- [Requirement descriptions]

## Configuration
- shell: true/false
```
