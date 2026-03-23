## 1. DeboLink Component

- [x] 1.1 Create `DeboLink.jsx` in `src/components/ui/` — renders `<a>` with `href` fallback, `onClick` emits `selectStory` via `addons.getChannel()`. Props: `storyId`, `title`, `name`, `children`, plus pass-through style/className.
- [x] 1.2 Export DeboLink from `src/components/ui/index.js`

## 2. useSections Hook

- [x] 2.1 Create `useSections.js` in `src/hooks/` — fetches `/__designbook/status`, extracts `sections` array, listens for `designbook:file-add/update/delete` channel events with path starting `sections/` to re-fetch
- [x] 2.2 Export useSections from `src/hooks/` (direct import, no index needed)

## 3. Migrate Components to DeboLink

- [x] 3.1 `DeboSceneCard.jsx` — remove `navigateStorybook()`, replace clickable area with DeboLink using `storyId` prop
- [x] 3.2 `DeboNumberedList.jsx` — remove `navigateStorybook()`, replace item click with DeboLink. Update item interface to accept `storyId` or `title`+`name` instead of raw path string.
- [x] 3.3 `DeboSceneGrid.jsx` — remove `toStoryId()`, pass `title` and `name` to DeboSceneCard/DeboLink instead of constructing storyId manually

## 4. DeboSectionsOverview Refresh

- [x] 4.1 Replace `virtual:designbook-sections` import with `useSections()` hook
- [x] 4.2 Add "Sections" heading to empty state (match non-empty state's SectionHeading)
- [x] 4.3 Replace hardcoded `/docs/...--docs` links with DeboLink using `title` + `name="Overview"`

## 5. Cleanup

- [x] 5.1 Remove `virtual:designbook-sections` virtual module from `vite-plugin.ts` (resolveId + load + buildSectionsModule)
- [x] 5.2 Rebuild addon (`pnpm --filter storybook-addon-designbook build`) and verify no import errors
