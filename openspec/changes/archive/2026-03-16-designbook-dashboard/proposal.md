## Why

The Designbook addon Panel currently shows only a workflow activity log. There is no way to see the overall status of all Designbook-managed files (data model, tokens, sections, view modes, shell) at a glance. Users must check the filesystem manually to know what exists and what's missing. Replacing the current Panel with a Dashboard page gives a project-wide overview and keeps the activity log in context per area.

## What Changes

- **New Dashboard page** in Storybook manager replacing the current export page — shows status of all Designbook-managed files grouped by area (Design System, Data Model, Shell, Sections), with workflow logs per area and a global "Recent Activity" strip at the top.
- **New API endpoint** `/__designbook/status` in the Vite plugin that scans `$DESIGNBOOK_DIST` and returns a structured status object (file existence, section completeness, view mode counts).
- **Panel repurposed** — stripped down to an empty placeholder (Scene Inspector will be added in a future change).
- **Panel removed from current activity log duty** — notifications already run independently via `manager-notifications.ts`.

## Capabilities

### New Capabilities
- `dashboard-page`: Storybook manager page showing project-wide Designbook file status, grouped by area with per-area workflow logs and a global recent activity strip.
- `dashboard-status-api`: Server-side endpoint that scans `$DESIGNBOOK_DIST` and returns structured status JSON for all managed file categories.

### Modified Capabilities
- `scene-metadata`: Panel no longer renders activity log — becomes empty placeholder for future Scene Inspector.

## Impact

- `packages/storybook-addon-designbook/src/components/Panel.tsx` — gutted to empty placeholder
- `packages/storybook-addon-designbook/src/manager.tsx` — registers Dashboard page instead of (or in addition to) panel
- `packages/storybook-addon-designbook/src/vite-plugin.ts` — new `/__designbook/status` endpoint
- New React components for the Dashboard page (DashboardPage, StatusCard, ActivityStrip)
- No breaking changes — notifications remain independent, existing workflows unaffected
