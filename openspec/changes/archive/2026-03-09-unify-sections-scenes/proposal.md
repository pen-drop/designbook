# Unify Sections and Scenes

## Problem

Three separate code paths and two file formats for scene-like content. Section metadata lives in `spec.section.yml`, scenes in `*.scenes.yml`, shell docs in a static MDX.

## Proposed Change

Everything becomes `*.scenes.yml` with integrated metadata:

### Unified File Format

```yaml
# ratgeber.section.scenes.yml — section metadata + scenes in one file
id: ratgeber
title: Ratgeber
description: Tipps, Gesundheitsratgeber und Community-Beiträge
status: planned
order: 4

scenes:
  - name: Ratgeber Detail
    layout: shell
    content:
      - entity: node.article
        view_mode: full
```

```yaml
# spec.shell.scenes.yml — shell metadata + scenes in one file
id: shell
title: Application Shell

scenes:
  - name: default
    content:
      - component: designbook_design:page
        ...
```

### File Convention

| Pattern | Has Overview | Has Scenes |
|---------|-------------|------------|
| `*.section.scenes.yml` | ✅ (from metadata) | ✅ |
| `spec.shell.scenes.yml` | ✅ (from metadata) | ✅ |
| `*.scenes.yml` (plain) | ❌ | ✅ |

### Handler Registry (`scene-handlers.ts`)

```typescript
export const defaultHandlers: SceneHandler[] = [
  {
    pattern: '.scenes.yml',
    type: 'canvas',
    overviewWhen: (filename) =>
      filename.includes('.section.scenes.yml') ||
      filename.startsWith('spec.'),
  },
];
```

### Sidebar Result

```
Designbook/
  Shell/
    Overview              ← from spec.shell.scenes.yml metadata
    Default               ← scene story
  Sections/
    Ratgeber/
      Overview            ← from ratgeber.section.scenes.yml metadata
      Ratgeber Detail     ← scene story
```

### Removed

- `spec.section.yml` (merged into `*.section.scenes.yml`)
- `loadSectionYml()`, `sectionIndexer`
- `04-shell.mdx`, `DeboSectionDetailPage`

## Affected Skills & Workflows

### Workflows

| File | Change |
|------|--------|
| `debo-product-sections.md` | Create `*.section.scenes.yml` instead of `spec.section.yml` |
| `debo-shape-section.md` | Merge output into `*.section.scenes.yml` |
| `debo-sample-data.md` | Read from `*.section.scenes.yml` |
| `debo-design-screen.md` | Scene output goes into existing `*.section.scenes.yml` |
| `debo-design-shell.md` | `shell.scenes.yml` → `spec.shell.scenes.yml` |
| `debo-export-product.md` | Updated filenames |
| `debo-screenshot-design.md` | Updated filenames |

### Skills

| File | Change |
|------|--------|
| `designbook-scenes/SKILL.md` | Format includes metadata keys, updated examples |
| `designbook-sample-data/SKILL.md` | Reads section from `*.section.scenes.yml` |
| `designbook-components-sdc/resources/shell-generation.md` | Updated filenames |

## Impact

- **One file per section** — metadata + scenes together
- **One handler** — extensible via registry
- **No React** — Overview is plain HTML story
- **No docs pages** — everything is stories
