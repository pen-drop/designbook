## Context

Design OS's `/design-shell` creates both a specification file and actual React components (AppShell, MainNav, UserMenu). In Designbook, we follow the read-only display pattern: the AI command captures the design decisions as a Markdown specification, and Storybook displays it. Actual component implementation happens separately during development.

## Goals / Non-Goals

**Goals:**
- Create a "Design Shell" Storybook page showing the shell specification
- Create `/design-shell` AI command that reads all prior context (vision, roadmap, tokens)
- Capture layout pattern, navigation structure, user menu, responsive behavior
- Follow the Designbook Markdown format for consistency

**Non-Goals:**
- Creating actual shell React components (AppShell, MainNav, etc.) — that's implementation
- Previewing the shell in an iframe like Design OS does
- Generating code or component scaffolding

## Decisions

### Decision 1: Specification Only, No Components

**Choice:** Only create the shell specification as Markdown, not the actual shell components.

**Rationale:**
- Designbook captures design decisions; implementation is a separate step
- Consistent with how product vision, roadmap, and data model work
- Shell components are project-specific and would be built during development

### Decision 2: Markdown Format Matching Design OS Shell Spec

**Choice:** Use the same section structure as Design OS's `spec.md`:
```markdown
# Application Shell
## Overview
## Navigation Structure
## User Menu
## Layout Pattern
## Responsive Behavior
## Design Notes
```

**Rationale:**
- Direct compatibility with Design OS format
- Parser can extract overview, navigation items, layout, and responsive info
- Comprehensive enough to capture all design decisions

### Decision 3: ShellSpecCard with Collapsible Sections

**Choice:** `ShellSpecCard` shows overview text, navigation items in a collapsible list, and layout/responsive info in additional collapsibles.

**Rationale:**
- Shell specs can be lengthy — collapsible sections keep it scannable
- Navigation items are the most important detail
- Matches the card+collapsible pattern used by all other workflow display components
