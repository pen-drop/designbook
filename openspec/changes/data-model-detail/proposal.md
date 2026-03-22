# Data Model Detail View

## Problem

`DeboDataModel` only shows a card grid with title, badge, and field count per bundle. No way to inspect fields, view modes, mapping templates, or sample templates.

## Solution

Add a detail view inside `DeboDataModel` that activates when a bundle card is clicked. Shows:

1. **Fields table** — all fields with type, title, required, multiple, settings, sample_template
2. **View Modes** — each view mode with its template and settings from data-model.yml
3. **Entity Mapping** — raw JSONata expression per view mode, loaded from `entity-mapping/{type}.{bundle}.{viewMode}.jsonata`

## Deep Link

Uses `entity` query param (from url-state-tabs change):
- `?tab=data-model&entity=node.pet` → opens detail for node.pet

## Depends On

- `url-state-tabs` change (for `useUrlState` hook and controlled tab state in DeboFoundationPage)

## Component Structure

```
DeboDataModel({ data, selectedEntity, onSelectEntity })
├── selectedEntity=null → Card grid (existing, cards become clickable)
└── selectedEntity="node.pet" → BundleDetail
    ├── Back button → onSelectEntity(null)
    ├── Header: title, badge, description, entity path
    ├── Fields table (all field properties)
    └── View Modes section
        └── per view mode: template, settings, raw jsonata (fetched)
```

## Scope

- Edit: `display/DeboDataModel.jsx` — add click handler, detail view routing
- New: `display/DeboDataModelDetail.jsx` — BundleDetail component (fields table + view modes + jsonata raw)
- Edit: `pages/DeboFoundationPage.jsx` — pass entity state down to DeboDataModel
- Uses: `loadDesignbookFile` to fetch jsonata files on demand
