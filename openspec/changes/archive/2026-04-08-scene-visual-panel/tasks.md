## 1. Screenshot Storage Convention

- [ ] 1.1 Update `screenshot` core task to use `designbook/screenshots/{storyId}/storybook/{breakpoint}.png` (already defined in visual-diff-integration)
- [ ] 1.2 Update `resolve-reference` core task to use `designbook/screenshots/{storyId}/reference/{breakpoint}.png` (already defined)
- [ ] 1.3 Update `visual-compare` core task to write report to `designbook/screenshots/{storyId}/report.md`
- [ ] 1.4 Add `designbook/screenshots/` to `.gitignore`

## 2. Visual Tab Component

- [ ] 2.1 Create `DeboVisualTab.tsx` — top-level tab component, reads current story's storyId, derives screenshot directory path
- [ ] 2.2 Create Screenshots sub-tab: breakpoint grid using `/__designbook/load` for image src
- [ ] 2.3 Create References sub-tab: same grid layout for reference images
- [ ] 2.4 Create Compare sub-tab: side-by-side layout per breakpoint (full-width, responsive — stack vertically on narrow viewport)
- [ ] 2.5 Create Report sub-tab: render `report.md` via `parseMarkdown` as HTML

## 3. Tab Registration

- [ ] 3.1 Replace placeholder in `manager.tsx` — render `DeboVisualTab` in the `types.TAB` addon (already registered with route `/visual/{storyId}`)
- [ ] 3.2 Add storyId → screenshot directory mapping via `/__designbook/load` endpoint

## 4. Section Page Cleanup

- [ ] 4.1 Remove Screenshots tab from `DeboSectionPage.jsx`
- [ ] 4.2 Remove `screenshots.md` parsing from `parsers.js` (if no longer used elsewhere)
