# URL State for Tabs (Deep Links)

## Problem

All `TabsView` instances use `defaultSelected` (uncontrolled). Users can't link to a specific tab — the URL doesn't reflect which tab is active.

## Solution

1. Create a `useUrlState(key, defaultValue)` hook that reads/writes query params on `window.location` (iframe) via `replaceState`.
2. Convert all pages using `TabsView` to controlled mode (`selected` + `onSelectionChange`).

## Affected Pages

| Page | File | Param | Values |
|------|------|-------|--------|
| DeboFoundationPage | `pages/DeboFoundationPage.jsx` | `tab` | `vision`, `data-model` |
| DeboDesignSystemPage | `pages/DeboDesignSystemPage.jsx` | `tab` | `guidelines`, `tokens`, `css` |
| DeboSectionPage | `pages/DeboSectionPage.jsx` | `tab` | `spec`, `data`, `screenshots` |

## Hook API

```js
const [value, setValue] = useUrlState('tab', 'vision');
// Reads from URL on mount, writes via replaceState on change
```

## Scope

- New file: `hooks/useUrlState.js`
- Edit: 3 page components (swap `defaultSelected` → `selected` + `onSelectionChange`)
- No backend/middleware changes needed
- Foundation page also passes `entity` param down (consumed by data-model-detail change)
