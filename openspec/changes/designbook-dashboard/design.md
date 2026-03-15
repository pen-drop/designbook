## Context

The Designbook addon for Storybook currently has:
- A **Panel** (bottom bar) showing a workflow activity log with polling
- **Notifications** running independently via `manager-notifications.ts`
- Two API endpoints: `/__designbook/workflows` (workflow data) and `/__designbook/load` (file loader)
- A `DeboExportPage` that checks file existence via `designbookFileExists()` and shows a checklist
- A rich set of Debo UI components including `DeboActionList`, `DeboBadge`, `DeboCollapsible`, `DeboPageLayout`

## Goals / Non-Goals

**Goals:**
- Dashboard page replacing the Export page — shows all managed file status grouped by area
- Each area rendered as a **StatusBox**: horizontal badge row (status overview) + collapsible workflow log
- Sections dynamically discovered with per-section StatusBox
- Global "Recent Activity" strip at top
- Single polling endpoint for all data

**Non-Goals:**
- Scene Inspector panel (future change)
- File editing from Dashboard
- New card component — compose from existing primitives

## Decisions

### 1. StatusBox Pattern

Each area (Design System, Data Model, Shell, Section) is rendered as a **StatusBox** — a bordered container with two layers:

```
┌─ Section: Episodenguide ────────────────────────┐
│                                                   │
│  ✅ scenes (3)    ✅ data (19)    ✅ 4 views     │  ← Badge row: DeboBadge
│                                                   │
│  ── Workflows ──────────────────────────────────  │
│  ✅ Sample Data              12.03 09:45         │  ← DeboActionList.Item
│  ✅ Design Screen            12.03 09:54         │
│                                                   │
└───────────────────────────────────────────────────┘
```

**Badge row:** `DeboBadge` with `color="green"` (exists) or a muted/gray variant (missing). Each badge shows the artifact name and count. Missing badges include a hint tooltip or subtitle.

**Workflow log:** `DeboActionList` with `done`/`in-progress` items filtered to this area. Only shown if workflows exist for this area.

### 2. DeboStatusBox Component

New component `DeboStatusBox` — composes existing primitives:

```jsx
<DeboStatusBox title="Section: Episodenguide">
  <DeboStatusBox.Badges>
    <DeboBadge color="green">scenes (3)</DeboBadge>
    <DeboBadge color="green">data (19)</DeboBadge>
    <DeboBadge color="green">4 views</DeboBadge>
  </DeboStatusBox.Badges>
  <DeboStatusBox.Log>
    <DeboActionList>
      <DeboActionList.Item status="done" title="Sample Data" timestamp="12.03 09:45" />
    </DeboActionList>
  </DeboStatusBox.Log>
</DeboStatusBox>
```

Styled with the same Debo conventions (`debo:` prefix, Tailwind classes, white bg, subtle border).

### 3. DeboBadge Extension

Add a `"gray"` color variant for missing/pending status:

```jsx
<DeboBadge color="gray">scenes</DeboBadge>  // missing, muted
<DeboBadge color="green">scenes (3)</DeboBadge>  // exists
```

### 4. Dashboard Page Structure

```
DeboDashboardPage
├── ActivityStrip (last 5 workflows, compact DeboActionList)
├── DeboStatusBox (Design System)
│   ├── Badges: tokens
│   └── Log: debo-design-tokens, debo-css-generate
├── DeboStatusBox (Data Model)
│   ├── Badges: data-model
│   └── Log: debo-data-model
├── DeboStatusBox (Shell)
│   ├── Badges: shell scenes
│   └── Log: debo-design-shell
└── DeboStatusBox[] (per section, dynamically discovered)
    ├── Badges: scenes, data, view-modes
    └── Log: debo-sample-data, debo-design-screen, etc.
```

### 5. Dashboard Replaces DeboExportPage

Transform `DeboExportPage` → `DeboDashboardPage`. Register at the same route. The export checklist content is subsumed by the StatusBox pattern.

### 6. Status API Endpoint

`GET /__designbook/status` returns:

```typescript
interface DesignbookStatus {
  designSystem: { tokens: boolean };
  dataModel: { exists: boolean };
  shell: { exists: boolean; sceneCount: number };
  sections: Array<{
    id: string;
    title: string;
    hasScenes: boolean;
    sceneCount: number;
    hasData: boolean;
    dataRecordCount: number;
    viewModeCount: number;
  }>;
  workflows: WorkflowEntry[];
}
```

### 7. Workflow-to-Area Mapping

```typescript
const areaMap: Record<string, string> = {
  'debo-design-tokens': 'design-system',
  'debo-css-generate': 'design-system',
  'debo-data-model': 'data-model',
  'debo-design-shell': 'shell',
  'debo-sample-data': 'section',
  'debo-design-screen': 'section',
  'debo-design-component': 'section',
  'debo-shape-section': 'section',
};
```

Section-specific workflows matched by title containing the section name.

### 8. Panel Becomes Placeholder

Strip `Panel.tsx` to "Scene Inspector — coming soon". No polling, no state.

## Risks / Trade-offs

- **View-mode count is global, not per-section** → Acceptable for status overview.
- **Workflow-to-section matching by title** → Could be imprecise. Future: add `section` field to workflow files.
