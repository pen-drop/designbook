## Tabs component

Use Storybook's built-in `TabsView` from `storybook/internal/components`. No custom tab component needed.

```jsx
import { TabsView } from 'storybook/internal/components';

<TabsView
  defaultSelected="vision"
  tabs={[
    { id: 'vision', title: 'Vision', children: () => <VisionContent /> },
    { id: 'data-model', title: 'Data Model', children: () => <DataModelContent /> },
  ]}
/>
```

`TabsView` props:
- `tabs`: Array of `{ id, title, children }` where children is a component or render function
- `defaultSelected`: Initial tab id
- `selected` / `onSelectionChange`: Controlled mode (optional)

## Page structure

### Foundation page

```
┌──────────────────────────────────────┐
│ [Vision]  [Data Model]               │  ← TabsView bar
├──────────────────────────────────────┤
│                                      │
│  Vision tab:                         │
│    → DeboProductOverview             │
│                                      │
│  Data Model tab:                     │
│    → DeboSection with DeboDataModel  │
│                                      │
└──────────────────────────────────────┘
```

### Design System page

```
┌──────────────────────────────────────┐
│ [Tokens]  [Shell]                    │  ← TabsView bar
├──────────────────────────────────────┤
│                                      │
│  Tokens tab:                         │
│    → DeboSection with DeboDesignTokens│
│                                      │
│  Shell tab:                          │
│    → DeboSection with shell content  │
│    + DeboSceneGrid                   │
│                                      │
└──────────────────────────────────────┘
```

## File changes

### New files
- `src/components/pages/DeboFoundationPage.jsx` — Foundation page with TabsView
- `src/pages/foundation.scenes.yml` — Page registration (order 1)

### Modified files
- `src/components/pages/DeboDesignSystemPage.jsx` — Refactor to use TabsView
- `src/pages/design-system.scenes.yml` — Update order to 2
- `src/pages/sections-overview.scenes.yml` — Update order to 3
- `src/components/pages/index.js` — Add Foundation, remove Vision/DataModel exports
- `src/components/index.js` — No DeboTabs needed (using Storybook built-in)

### Deleted files
- `src/pages/vision.scenes.yml`
- `src/pages/data-model.scenes.yml`
- `src/components/pages/DeboVisionPage.jsx`
- `src/components/pages/DeboDataModelPage.jsx`
