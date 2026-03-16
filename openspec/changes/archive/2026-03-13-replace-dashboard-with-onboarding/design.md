## Context

The Storybook addon currently registers a full `/designbook` page via `types.PAGE` in `manager.tsx`. This page renders `DeboDashboardPage` — a large component that polls `/__designbook/status` and displays status boxes for Foundation, Shell, Sections, and Recent Activity. The information shown duplicates what's already on the individual pages (Vision, Design System, etc.).

The user wants a compact onboarding guide block that sits above the sidebar navigation, always visible, showing just badges and an activity log.

## Goals / Non-Goals

**Goals:**
- Remove the full-page dashboard from Storybook's page navigation
- Provide a compact, always-visible onboarding status block
- Show badge-style indicators for key milestones (vision, tokens, data-model, shell, sections)
- Sections badge shows summary count (e.g. `sections (2/4)`) with green/yellow/gray state
- Include a collapsible detail area with per-section badges and activity log
- Reuse the existing `/__designbook/status` endpoint

**Non-Goals:**
- No guided wizard or step-by-step onboarding flow
- No changes to the `/__designbook/status` API response shape

## Decisions

### 1. Placement: Storybook sidebar brand area

Use Storybook's `addons.setConfig({ sidebar: { renderLabel } })` or the brand-target area. Storybook 8+ supports custom sidebar header via `managerHead` or the `sidebar.brandTarget` render slot. The simplest approach: render the onboarding guide inside the existing **Tool** bar area or as a custom sidebar header component.

**Chosen approach**: Register the onboarding guide as a `types.TOOL` replacement or use `addons.setConfig` to inject it above the sidebar tree. If neither works cleanly, fall back to rendering it inside the existing Panel (bottom panel) as a persistent status bar.

**Alternative rejected**: Keeping it as a page but smaller — still occupies a nav slot and isn't "always visible."

### 2. Component: `DeboOnboardingGuide`

A single React component that:
- Polls `/__designbook/status` (reuses the existing endpoint, no API changes)
- Renders a horizontal row of small badges: vision, tokens, data-model, shell, sections
- Sections badge shows summary count (e.g. `sections (2/4)`) — green if all sections ready, yellow if partial, gray if none
- Below badges: a collapsible detail area containing per-section badges and recent workflow activity log
- Compact: ~60-80px height when collapsed, expandable for section detail + activity log

### 3. Reuse existing UI components

- `DeboBadge` — already exists, used for status indicators
- `DeboActionList` — already exists for workflow entries
- `DeboStatusBox` — DELETE, only used by dashboard

## Risks / Trade-offs

- **Storybook sidebar injection may be fragile** → Mitigation: Use official Storybook API (`addons.setConfig`). If API changes in future Storybook versions, the block simply won't render (non-critical feature).
- **Polling overhead** → The status endpoint is already polled by the dashboard. Same 3s interval is fine for a small block. Could reduce to 5s if needed.
- **Less detail than dashboard** → Intentional. Summary badge gives a quick glance; per-section detail is available in the collapsible area for those who need it.
