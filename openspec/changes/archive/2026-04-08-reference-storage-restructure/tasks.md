## 1. Meta.yml Schema & Storage

- [x] 1.1 Define `meta.yml` schema in `design/resources/story-meta-schema.md` — source always URL, `hasMarkup` flag, optional `origin`/`screenId`
- [x] 1.2 Add `.gitignore` entries for `designbook/stories/*/screenshots/current/` and `designbook/stories/*/screenshots/diff/` — documented in schema, intake task creates them per workspace

## 2. Scene Schema Cleanup

- [x] 2.1 Remove `reference` array from `design/resources/scenes-schema.md`
- [x] 2.2 Remove reference-related examples from scene schema documentation

## 3. Pipeline Restructuring

New pipeline: `intake → storybook-preview → capture → compare → polish`

- [x] 3.1 Update `design/workflows/design-verify.md` — new 5-step pipeline
- [x] 3.2 Update `design/tasks/intake--design-verify.md` — create/update `meta.yml`
- [x] 3.3 Keep `design/tasks/storybook-preview.md` as own step (shared across workflows)
- [x] 3.4 Remove `design/tasks/resolve-reference.md`
- [x] 3.5 Remove `design/tasks/partials/resolve-design-reference.md`

## 4. Capture Step

Both tasks: `each: reference.breakpoints`.

- [x] 4.1 Create `design/tasks/capture-reference.md` — Params: `url` (from source), `viewportWidth`, `outputPath`. Playwright loads URL at viewport width. Skips if reference exists and URL unchanged.
- [x] 4.2 Rename `design/tasks/screenshot.md` → `design/tasks/capture-storybook.md` — Params: `storybookUrl`, `viewportWidth`, `outputPath`.

## 5. Compare Step

Both tasks: `each: reference.breakpoints`.

- [x] 5.1 Create `design/tasks/compare-markup.md` — Params: `referenceUrl`, `storybookUrl`, `breakpoint`, `viewportWidth`. Inspects CSS, fonts, computed styles, DOM of both URLs and compares. Only runs when `source.hasMarkup: true`. Replaces `inspect-storybook` + `inspect-stitch`.
- [x] 5.2 Create `design/tasks/compare-screenshots.md` — Params: `referencePath`, `currentPath`, `threshold`, `breakpoint`. Pixel diff, writes `lastDiff` and `lastResult` to `meta.yml`. Replaces `visual-compare`.
- [x] 5.3 Update `design/tasks/polish.md` — Params: `storyId`, `compareResults`.

## 6. Remove Old Tasks

- [x] 6.1 Remove `design/tasks/inspect-storybook.md` — merged into `compare-markup`
- [x] 6.2 Remove `design/tasks/visual-compare.md` — replaced by `compare-screenshots`
- [x] 6.3 Remove `designbook-stitch/tasks/screenshot-stitch.md`
- [x] 6.4 Remove `designbook-stitch/tasks/inspect-stitch.md` — merged into `compare-markup`

## 7. Remove Rules (replaced by task params)

- [x] 7.1 Remove `design/rules/screenshot-storage.md` — paths are task params
- [x] 7.2 Remove `design/rules/image-reference.md` — no type dispatch
- [x] 7.3 Remove `design/rules/url-reference.md` — no type dispatch
- [x] 7.4 Remove `design/rules/inspect-format.md` — output schema of compare-markup
- [x] 7.5 Remove `designbook-stitch/rules/stitch-reference.md` — replaced by resolve-stitch-url

## 8. Rules (keep/new)

- [x] 8.1 Keep `design/rules/playwright-session.md` — updated steps to [capture, compare]
- [x] 8.2 Keep `design/rules/guidelines-context.md` — updated steps (screenshot→capture, resolve-reference+visual-compare→compare)
- [x] 8.3 Create `designbook-stitch/rules/resolve-stitch-url.md` — when `origin: stitch`: resolves `screenId` → `source.url` + sets `hasMarkup: true` via MCP `get_screen`

## 9. Storybook Addon

- [x] 9.1 Update `VisualCompareTool.tsx` — `discoverBreakpoints()` reads `meta.yml`
- [x] 9.2 Update `withVisualCompare.ts` — new reference image path
- [x] 9.3 Remove `parseReport()` and report.md fetching

## 10. Verification

- [ ] 10.1 Run `design-verify` end-to-end in test workspace
- [x] 10.2 Verify addon dropdown from `meta.yml`
- [x] 10.3 Verify overlay from new path
- [x] 10.4 Verify `pnpm check` passes — typecheck + lint + test (414/414 green)
