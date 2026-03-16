## 1. Status API

- [x] 1.1 Add `GET /__designbook/status` endpoint in `vite-plugin.ts` — scans `$DESIGNBOOK_DIST` and returns structured JSON
- [x] 1.2 Scan `sections/` dirs: parse scenes files for title/scene count, check data.yml existence and count records, count view-mode `.jsonata` files
- [x] 1.3 Check design-system/design-tokens.yml, data-model.yml, shell/spec.shell.scenes.yml existence and parse scene count
- [x] 1.4 Include workflow data in status response (reuse `scanAllWorkflows`)

## 2. UI Components

- [x] 2.1 Add `color="gray"` variant to `DeboBadge`
- [x] 2.2 Create `DeboStatusBox` component — titled container with `DeboStatusBox.Badges` (horizontal badge row) and `DeboStatusBox.Log` (DeboActionList for workflows)

## 3. Dashboard Page

- [x] 3.1 Create `DeboDashboardPage` component replacing `DeboExportPage` — polls `/__designbook/status`, renders StatusBoxes
- [x] 3.2 Implement ActivityStrip at top — last 5 workflows as compact DeboActionList
- [x] 3.3 Render Design System, Data Model, Shell StatusBoxes with badges + filtered workflow logs
- [x] 3.4 Render per-section StatusBoxes dynamically from status data with scenes/data/view-modes badges + filtered logs
- [x] 3.5 Show hints for missing files (e.g., "Run /debo-sample-data figurenkatalog")
- [x] 3.6 Handle empty states (no sections, no workflows)

## 4. Manager Registration

- [x] 4.1 Update `manager.tsx` — register Dashboard page replacing Export page route
- [x] 4.2 Strip `Panel.tsx` to empty placeholder ("Scene Inspector — coming soon")

## 5. Cleanup

- [x] 5.1 Remove unused DeboExportPage and related imports
- [x] 5.2 Lint and build
- [ ] 5.3 Test: dashboard loads, status endpoint returns correct data, polling updates live, badges reflect file state
