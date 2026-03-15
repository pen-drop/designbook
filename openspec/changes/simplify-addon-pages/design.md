## Context

The addon ships three internal "page" entries — Foundation, Design System, and Sections Overview — as `.scenes.yml` files with a `page` field instead of real scenes. These are special-cased throughout the build pipeline:

- `vite-plugin.ts` → `buildPageModule()` generates CSF from YAML at load time; the `resolveId` hook allows `.scenes.yml` imports from outside `designbookDir`
- `preset.ts` (`experimental_indexers`) → dedicated branch for `page`-field files that emits `docs` + `story` index entries
- `preset.ts` (`stories`) → `builtinPagesGlob` points at `src/pages/*.scenes.yml` to feed both the indexer and vite plugin

The `page` field was never a documented feature for users — it only exists to register these three addon-internal pages. Real CSF `.stories.jsx` files would express the same thing more directly and eliminate all this special-case logic.

## Goals / Non-Goals

**Goals:**
- Replace `src/pages/*.scenes.yml` with `src/pages/*.stories.jsx` (real CSF files)
- Remove `buildPageModule()` and the `page`-field branch from `vite-plugin.ts`
- Remove the `page`-field indexing branch from `preset.ts`
- Update the `builtinPagesGlob` in `preset.ts` to match `*.stories.jsx`

**Non-Goals:**
- Changing the pages' visual design or the React components they wrap
- Removing `.scenes.yml` support for user content (sections, shell) — that pipeline stays
- The `resolveId` hook for `.scenes.yml` is kept; it's still needed for user scene files in `designbookDir`

## Decisions

### Replace YAML with JSX, not with TSX or MDX

**Decision:** Use `.stories.jsx` (not `.stories.tsx`, not `.stories.mdx`).

**Rationale:** The existing pages directory is JSX (`DeboFoundationPage.jsx` etc.) and the tsup `onSuccess` command already copies `src/pages/` verbatim to `dist/pages/`. JSX requires no additional type declarations and matches the surrounding code style. MDX would add an MDX compilation dependency that isn't needed here.

### Keep the `cp -r src/pages dist/pages` copy in tsup

**Decision:** No change to `tsup.config.ts` — the `onSuccess` copy command already handles the pages directory generically.

**Rationale:** The command copies the entire `src/pages/` directory, so replacing `.scenes.yml` with `.stories.jsx` is picked up automatically. No tsup config change needed.

### Storybook `stories` glob update in `preset.ts`

**Decision:** Change `builtinPagesGlob` from `dist/pages/*.scenes.yml` to `dist/pages/*.stories.jsx`.

**Rationale:** The new files are plain CSF — Storybook discovers and indexes them natively without going through the custom indexer. The custom indexer (`experimental_indexers`) is no longer invoked for these files at all once the glob changes.

### Inline the CSF structure in each `.stories.jsx`

**Decision:** Each JSX file imports its Page component and re-exports the default CSF meta + a named story export directly.

**Rationale:** `buildPageModule()` was essentially generating this code at runtime. Writing it as static source is simpler to read, debug, and modify. The generated output was:
```js
import React from 'react';
import { DeboFoundationPage } from '.../DeboFoundationPage.jsx';
const DocsPage = () => React.createElement(DeboFoundationPage);
export default { title: '...', tags: ['!dev'], parameters: { layout: 'fullscreen', docs: { page: DocsPage }, designbook: { order: 0 } } };
export const Foundation = { render: () => '' };
```
This is idiomatic CSF and should be written verbatim.

## Risks / Trade-offs

- **JSX transform in preview** → The `preset.ts` `viteFinal` hook already sets `esbuild: { jsx: 'automatic' }` globally, so JSX in addon pages works without `@vitejs/plugin-react`. No change needed.
- **HMR for `.stories.jsx` in dist/pages** → Because the files are in `dist/`, they won't HMR during dev of the test integration. This was already the case for the `.scenes.yml` files they replace — no regression.
- **`resolveId` still contains `.scenes.yml` handling** → After this change the only callers are user scene files inside `designbookDir`. The "outside designbookDir" case (previously needed for `src/pages/*.scenes.yml`) becomes dead code but is harmless to leave; a follow-up cleanup can remove it.

## Migration Plan

1. Add `src/pages/foundation.stories.jsx`, `design-system.stories.jsx`, `sections-overview.stories.jsx` with the inline CSF structure described above.
2. Delete `src/pages/foundation.scenes.yml`, `design-system.scenes.yml`, `src/pages/spec.shell.scenes.yml` (if that is also a page-type file), `sections-overview.scenes.yml`.
3. Remove `buildPageModule()` and its call site from `vite-plugin.ts`. The helper functions `buildDocsPage`, `injectDocsPage`, `buildDocsOnlyModule`, `extractPageType`, and `capitalize` are still used by `loadSceneModule()` for section files — do not remove them.
4. Remove the `page`-field branch from `experimental_indexers` in `preset.ts`.
5. Update `builtinPagesGlob` in `preset.ts` `stories()` from `*.scenes.yml` to `*.stories.jsx`.
6. Build (`pnpm build`) and verify the three pages still appear in Storybook.

Rollback: revert the three steps above — no data migration involved.

## Open Questions

None.
