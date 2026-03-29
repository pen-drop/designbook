## 1. Screenshot Metadata (CLI)

- [ ] 1.1 Extend `screenshot.ts` to extract scene definition from parsed scene file (components, entities, shellRef)
- [ ] 1.2 Add design-tokens.yml reading in `screenshot.ts` — extract color/font/spacing summary
- [ ] 1.3 Add `metadata` field to `ScreenshotResult` interface and JSON output
- [ ] 1.4 Add tests for metadata extraction (scene with components+entities, scene without tokens)

## 2. designbook-stitch Skill

- [ ] 2.1 Create `designbook-stitch/SKILL.md` with name, description, `user-invocable: false`, `disable-model-invocation: true`
- [ ] 2.2 Create `designbook-stitch/tasks/resolve-reference.md` — instructions for resolving stitch:// URL via `mcp__stitch__get_screen` → `screenshot.downloadUrl` → WebFetch → local PNG
- [ ] 2.3 Create `designbook-stitch/tasks/list-screens.md` — instructions for listing Stitch screens during design intake (reads `guidelines.yml` for project config)

## 3. Core Visual-Diff Task

- [ ] 3.1 Create `designbook/design/tasks/visual-diff.md` — shared task with params (scene), reads (guidelines.yml, design-tokens.yml), no `when` condition
- [ ] 3.2 Define task steps: screenshot → reference resolve (delegate by type) → context collection → AI compare → report
- [ ] 3.3 Define skip behavior: no reference block → `workflow done` with skipped status
- [ ] 3.4 Define report format: markdown table with Element, Match, Issue, Severity columns

## 4. Workflow Integration

- [ ] 4.1 Add `test: { steps: [visual-diff] }` stage to `design-shell.md` workflow frontmatter
- [ ] 4.2 Add `test: { steps: [visual-diff] }` stage to `design-screen.md` workflow frontmatter
- [ ] 4.3 Add `test: { steps: [visual-diff] }` stage to `design-component.md` workflow frontmatter
- [ ] 4.4 Remove `design/workflows/design-test.md` workflow file
- [ ] 4.5 Remove `design/tasks/visual-diff--design-test.md` task file
- [ ] 4.6 Remove `design-test` from SKILL.md argument-hint list

## 5. Guidelines Schema

- [ ] 5.1 Add `visual_diff` section to guidelines.yml schema (viewports array, defaults)
- [ ] 5.2 Update `design-guidelines:intake` task to include visual_diff configuration question
- [ ] 5.3 Update `guidelines-context.md` rule to document visual_diff key usage
