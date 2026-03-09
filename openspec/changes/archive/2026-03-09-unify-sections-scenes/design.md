# Design: Unify Sections and Scenes

## Final Approach

Keep `DeboSectionDetailPage` (React) + `docs.page` pattern. Only unify code paths.

## File Format

`*.section.scenes.yml` combines section metadata + scenes:

```yaml
id: ratgeber
title: Ratgeber
description: Tipps und Community-Beiträge
status: planned
order: 4

scenes:
  - name: Ratgeber Detail
    layout: shell
    content:
      - entity: node.article
        view_mode: full
```

## Generated CSF Module

```javascript
import React from 'react';
import { DeboSectionDetailPage } from 'storybook-addon-designbook/dist/components/pages/DeboSectionDetailPage.jsx';

const DocsPage = () => (
  <><h1>Ratgeber</h1><DeboSectionDetailPage sectionId="ratgeber" /></>
);

export default {
  title: 'Designbook/Sections/Ratgeber',
  tags: ['!dev'],
  parameters: {
    layout: 'fullscreen',
    docs: { page: DocsPage },
  },
};

// Hidden canvas story (required by Storybook)
export const Ratgeber = { render: () => {} };

// Scene stories
export const RatgeberDetail = {
  render: () => { /* scene HTML */ },
  tags: ['scene'],
  parameters: { layout: 'fullscreen' },
  play: async ({ canvasElement }) => { ... },
};
```

## Handler Registry

```typescript
// scene-handlers.ts
export interface SceneHandler {
  pattern: string;
  hasOverview: (filename: string) => boolean;
}

export const defaultHandlers: SceneHandler[] = [
  {
    pattern: '.scenes.yml',
    hasOverview: (f) =>
      f.includes('.section.scenes.yml') || f.startsWith('spec.'),
  },
];
```

## Sidebar Result

```
Designbook/
  Shell/
    Docs                  ← docs.page (DeboSectionDetailPage)
    Default               ← scene story
  Sections/
    Ratgeber/
      Docs                ← docs.page (DeboSectionDetailPage)
      Ratgeber Detail     ← scene story
```

## Files Changed

| Action | File |
|--------|------|
| NEW | `src/renderer/scene-handlers.ts` |
| MODIFY | `src/vite-plugin.ts` — unified loader |
| MODIFY | `src/preset.ts` — merged indexer |
| DELETE | `src/onboarding/04-shell.mdx` |
| KEEP | `DeboSectionDetailPage` (reused) |
| MERGE | `spec.section.yml` → `*.section.scenes.yml` |
| RENAME | `shell.scenes.yml` → `spec.shell.scenes.yml` |
