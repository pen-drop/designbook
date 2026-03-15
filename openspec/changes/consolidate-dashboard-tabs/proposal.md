## Why

The Designbook dashboard currently has 4 separate pages (Vision, Data Model, Design System, Sections Overview). This creates too many sidebar entries and splits related content. Vision and Data Model are both "foundation" concerns. Tokens and Shell are both "design system" concerns. Consolidating into 2 tabbed pages reduces sidebar clutter and groups related content logically.

## What Changes

### Page consolidation

**Before (4 pages):**
- Vision (order 1)
- Data Model (order 2)
- Design System (order 3) — Tokens + Shell stacked vertically
- Sections Overview (order 4)

**After (3 pages):**
- Foundation (order 1) — Tab: Vision | Tab: Data Model
- Design System (order 2) — Tab: Tokens | Tab: Shell
- Sections Overview (order 3)

### New UI component

Create a `DeboTabs` component for tab navigation within pages. Simple state-based tabs, no URL routing needed.

### Page changes

1. **New `DeboFoundationPage`**: Combines `DeboVisionPage` and `DeboDataModelPage` content under tabs
2. **Modified `DeboDesignSystemPage`**: Refactored from vertical stack to tabbed layout (Tokens tab, Shell tab)
3. **Deleted pages**: `vision.scenes.yml`, `data-model.scenes.yml` page files removed
4. **Deleted components**: `DeboVisionPage.jsx`, `DeboDataModelPage.jsx` removed (content inlined into Foundation)
5. **Updated order**: Foundation=1, Design System=2, Sections Overview=3

## Capabilities

### New Capabilities

- `dashboard-tabs`: Tabbed page layout via `DeboTabs` UI component

### Modified Capabilities

- `design-system-page`: Refactored from vertical sections to tabbed layout
- `dashboard-pages`: Reduced from 4 to 3 pages with tab navigation

## Impact

- **Sidebar**: 4 entries → 3 entries under Designbook/
- **Page components**: 1 new (Foundation), 1 modified (Design System), 2 deleted (Vision, Data Model)
- **UI components**: 1 new (DeboTabs)
- **Page files**: 2 deleted, 1 new, 1 modified
- **Exports**: pages/index.js updated
