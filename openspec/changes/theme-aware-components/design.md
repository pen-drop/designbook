## Context

The Storybook theme object (`storybook/theming`) provides a structured set of color, background, and typography tokens. Components in `styled()` wrappers receive theme via the function parameter `({ theme }) => (...)`. Components with inline styles currently use hardcoded hex values.

Available theme properties already in use by existing `styled()` components:
- `theme.color.defaultText` — primary text
- `theme.color.mediumdark` — secondary/muted text
- `theme.color.medium` — subtle text / borders
- `theme.color.lighter` — light borders
- `theme.background.content` — content area background
- `theme.background.hoverable` — hover/subtle backgrounds
- `theme.background.app` — app-level background
- `theme.barBg` — toolbar/bar background
- `theme.appBorderColor` — border color
- `theme.typography.fonts.base` — base font
- `theme.typography.fonts.mono` — monospace font
- `theme.base` — "light" or "dark" (for conditional logic)

## Goals / Non-Goals

**Goals:**
- Replace all hardcoded hex colors with theme properties across 26 component files
- Establish a consistent mapping from hex values to theme tokens
- Support both light and dark modes with a single code path

**Non-Goals:**
- Creating a custom theme extension or design token layer on top of Storybook's theme
- Changing component layouts or behavior
- Modifying the theme object itself

## Decisions

### Convert inline-style components to styled() where practical

Components that have many themed properties should be converted from inline styles to `styled()` components, which receive theme automatically. Components with only 1-2 themed values can use `useTheme()` with inline styles instead.

**Why:** `styled()` is already the established pattern in the codebase. It keeps theme access implicit and avoids prop-drilling.

### Use theme.base for conditional status colors

Semantic status colors (success green `#16a34a`, error red `#dc2626`, warning amber `#f59e0b`) have no direct theme equivalent. Use `theme.base === 'dark'` to pick appropriate light/dark variants.

**Why:** Status colors need to remain semantically meaningful (green = success) rather than mapping to generic theme tokens. A light-mode green won't be readable on a dark background.

### Manager components (panels) use styled() with theme parameter

Panel components (WorkflowPanel, EntityPanel) already run in the Manager context where ThemeProvider is always available. Convert their inline style objects to `styled()` components.

**Why:** Panels have the most hardcoded values (52+). Converting to `styled()` is cleaner than adding `useTheme()` to every render function.

### Hex-to-theme mapping table

| Hex Pattern | Theme Property | Usage |
|-------------|---------------|-------|
| `#333`, `#2E3338`, `#475569` | `theme.color.defaultText` | Primary text |
| `#6b7280`, `#64748B`, `#7B8794` | `theme.color.mediumdark` | Secondary/muted text |
| `#888`, `#9ca3af`, `#94A3B8`, `#aaa` | `theme.color.medium` | Subtle text, placeholders |
| `#d1d5db`, `#CBD5E1` | `theme.color.lighter` | Light borders, dividers |
| `#e5e7eb`, `#E2E8F0`, `#eee` | `theme.appBorderColor` | Borders, separators |
| `#f3f4f6`, `#F1F5F9` | `theme.background.hoverable` | Subtle backgrounds |
| `#f9fafb`, `#F8FAFC` | `theme.background.hoverable` | Hover backgrounds |
| `#fff`, `#FFFFFF`, `#ffffff` | `theme.background.content` | Content backgrounds |
| `#1E293B` | `theme.color.defaultText` | Dark text (light mode badges) |
| `#3b82f6` (blue) | `theme.color.secondary` | Interactive/accent |
| `#7C3AED` (purple) | Keep as semantic color | Brand/workflow accent |
| `#16a34a`, `#66BF3C` (green) | Conditional on `theme.base` | Success status |
| `#dc2626`, `#DC2626` (red) | Conditional on `theme.base` | Error status |
| `#f59e0b`, `#92400E`, `#FEF3C7` (amber) | Conditional on `theme.base` | Warning status |
| `#22c55e` (green icon) | Keep as semantic color | Entity type indicator |

## Risks / Trade-offs

- **Visual regression risk** → Mitigated by testing each component in both light and dark mode after conversion
- **Nested ThemeProvider in mountReact pages** → Harmless, React uses nearest provider
- **Status/semantic colors lose exact hue** → Keeping them as conditional values preserves intent while adapting to mode
