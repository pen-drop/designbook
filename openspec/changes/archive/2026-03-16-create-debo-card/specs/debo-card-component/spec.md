# DeboCard Component

## Purpose

A reusable UI primitive that displays an entity bundle as a structured card with title, type badge, description, and metadata tags.

## Props Interface

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | yes | Bundle display name (e.g., "Projects") |
| `badge` | `string` | no | Entity type label shown as colored tag (e.g., "node") |
| `description` | `string` | no | Short description of the bundle |
| `entityPath` | `string` | no | Dot-notation entity path (e.g., "node.projects") |
| `fieldCount` | `number` | no | Number of fields in the bundle |
| `className` | `string` | no | Additional CSS classes |
| `children` | `ReactNode` | no | Optional extra content below metadata |

## Visual Structure (from Figma)

```
┌─────────────────────────────────────┐
│  Title                    [BADGE]   │
│                                     │
│  Description text that can          │
│  wrap to multiple lines.            │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  [entity.path]    [N Fields]        │
└─────────────────────────────────────┘
```

### Design Tokens (from Figma node 2015-153)

- **Card**: `debo:bg-white debo:rounded-lg debo:shadow-sm debo:p-5`
- **Title**: `debo:text-lg debo:font-semibold debo:text-slate-800`
- **Badge**: Extracted as `DeboBadge` component — `debo:uppercase debo:text-[10px] debo:font-bold debo:px-2 debo:py-0.5 debo:rounded` with color variants (rose, slate, blue, amber)
- **Description**: `debo:text-[15px] debo:text-slate-500`
- **Divider**: `debo:border-t debo:border-slate-100`
- **Metadata tags**: `debo:bg-slate-50 debo:text-slate-500 debo:text-xs debo:px-2.5 debo:py-1 debo:rounded`
- **Padding**: ~20px → `debo:p-5`

## Constraints

- All classes use `debo:` prefix — pure Tailwind utility classes, no DaisyUI component classes
- Under 50 lines, single responsibility
- No data fetching — props only
- Handles missing optional props gracefully (no badge, no description, no metadata)

## File Location

`packages/storybook-addon-designbook/src/components/ui/DeboCard.jsx`

## Registration

Export from `ui/index.js` and top-level `components/index.js`.

## Integration Point

`DeboDataModel.jsx` — replace `BundleSummary` with `DeboCard`, mapping bundle data to card props:
- `title` ← `bundle.title || key`
- `badge` ← entity type name (e.g., "node")
- `description` ← `bundle.description`
- `entityPath` ← `${entityType}.${bundleKey}`
- `fieldCount` ← `Object.keys(bundle.fields).length`
