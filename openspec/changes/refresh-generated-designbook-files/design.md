## Context

Designbook's Vite plugin (`vite-plugin.ts`) currently handles `.scenes.yml` loading and has basic HMR for data file dependencies via a `dataFileToScenes` Map. The `configureServer` hook watches the `designbook/` directory and emits change events for new `.scenes.yml` files. However, there is no mechanism for AI workflows to signal completion or for Storybook to show workflow progress.

The addon registers a panel (`Panel.tsx`) that currently displays a static list of available AI commands. The channel system (`EVENTS.REQUEST`/`EVENTS.RESULT`) exists for preview↔manager communication. Storybook provides `api.addNotification()` for toast notifications.

Existing UI components follow the `Debo*` pattern with `debo:` prefixed Tailwind classes. `DeboStepIndicator` is the closest analog to the new `DeboActionList`.

## Goals / Non-Goals

**Goals:**
- AI workflows write structured task files that Storybook can read
- Storybook refreshes automatically when workflows start and complete
- Users see live workflow progress in the addon panel
- Individual task completions trigger toast notifications
- Completed workflows are archived for history

**Non-Goals:**
- No bidirectional control (Storybook cannot start/stop workflows)
- No cross-workflow dependency tracking
- No persistent notification history beyond the panel
- No per-task HMR granularity — refresh only on workflow start/completion

## Decisions

### 1. YAML task files over WebSocket/IPC

**Decision:** Workflows write `tasks.yml` files to `designbook/workflows/changes/`. Vite's existing file watcher detects changes.

**Why over WebSocket:** No server dependency, works with any AI tool (not just Claude Code), survives Storybook restarts, files are inspectable and debuggable. The file system is the simplest reliable IPC mechanism.

**Why YAML:** Consistent with all other Designbook config formats (`.scenes.yml`, `data-model.yml`, `design-tokens.yml`).

### 2. Full reload on workflow start/completion only

**Decision:** Trigger full Storybook reload when a new `tasks.yml` appears (workflow started) and when all tasks reach `done` status (workflow completed). Individual task completions only trigger `api.addNotification()` toasts.

**Why not per-task HMR:** The indexer needs a full scan for new components/scenes. Partial HMR would miss new index entries. Full reload is simple and correct. Two reloads per workflow (start + end) is acceptable UX.

### 3. HTTP middleware + polling for panel data

**Decision:** The Vite plugin serves task data via a new `/__designbook/workflows` HTTP endpoint. The panel polls this endpoint on an interval (e.g., 3s) rather than using channel events.

**Why over channel events:** Channel events require preview↔manager round-trip through the iframe. The panel runs in manager context and can fetch HTTP directly. Polling is simpler than maintaining WebSocket state for file-system-driven updates. 3s polling is adequate for human-visible progress.

### 4. DeboActionList as UI primitive

**Decision:** New `DeboActionList` component in `src/components/ui/` following `DeboStepIndicator` patterns. Renders status icon, title, type badge, and relative timestamps.

**Why a separate component from DeboStepIndicator:** Step indicators show linear sequence with numbered steps. Task items show parallel work with types and timestamps — different data shape and visual layout.

### 5. Shared workflow-skill for task file I/O

**Decision:** A new agent skill (`workflow-skill`) provides utilities for creating, updating, and archiving task files. All `debo-*` workflows use this skill instead of writing YAML directly.

**Why a skill:** Ensures consistent format, handles atomic writes, manages the changes→archive lifecycle, and provides a single place to evolve the format.

## Risks / Trade-offs

- **Polling latency (3s)** → Acceptable for progress display. Notifications still feel instant because the file watcher triggers them immediately via full reload.
- **File write conflicts** → Only one workflow writes to a given `tasks.yml` at a time. Concurrent workflows use separate directories. No conflict possible.
- **Panel complexity** → Starting with read-only progress display. Future: clickable tasks, log output, workflow controls.
- **Skill adoption** → All existing debo-* workflows need updating to use the workflow-skill. Can be done incrementally — workflows without task tracking simply don't appear in the panel.

## Open Questions

- Should archived workflows be cleaned up automatically (e.g., after 30 days)?
- Should the panel show archived workflows in a collapsed "History" section?
