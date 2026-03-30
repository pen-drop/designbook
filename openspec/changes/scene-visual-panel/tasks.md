## 1. Screenshot Storage Convention

- [ ] 1.1 Update `screenshot` core task to write PNGs to `screenshots/{sceneName}/{breakpoint}.png` relative to scenes file parent
- [ ] 1.2 Update `resolve-reference` core task to write reference images to `screenshots/{sceneName}/reference/{breakpoint}.png`
- [ ] 1.3 Update `visual-compare` core task to write report to `screenshots/{sceneName}/report.md`
- [ ] 1.4 Add `**/screenshots/` to `.gitignore`

## 2. Visual Panel Component

- [ ] 2.1 Create `DeboVisualPanel.tsx` — reads current story's `parameters.scene.source` + scene name, derives screenshot directory path
- [ ] 2.2 Create Screenshots sub-tab: breakpoint grid using `/__designbook/load` for image src
- [ ] 2.3 Create References sub-tab: same grid layout for reference images
- [ ] 2.4 Create Compare sub-tab: side-by-side layout per breakpoint (responsive — stack on narrow panel)
- [ ] 2.5 Create Report sub-tab: render `report.md` via `parseMarkdown` as HTML

## 3. Panel Integration

- [ ] 3.1 Register Visual tab in `Panel.tsx` — show only when story has `parameters.scene`
- [ ] 3.2 Add scene name derivation from story ID/name to screenshot directory mapping

## 4. Section Page Cleanup

- [ ] 4.1 Remove Screenshots tab from `DeboSectionPage.jsx`
- [ ] 4.2 Remove `screenshots.md` parsing from `parsers.js` (if no longer used elsewhere)
