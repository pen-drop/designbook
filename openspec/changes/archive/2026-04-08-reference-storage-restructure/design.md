## Context

The `design-verify` workflow currently reads visual references from `*.scenes.yml` → `reference` array. Screenshots are stored at `designbook/screenshots/{storyId}/storybook|reference/{breakpoint}.png`. The Storybook addon (`VisualCompareTool`) discovers breakpoints by probing each known breakpoint path individually via HTTP GET.

Three existing OpenSpec changes built the current system:
- `visual-diff-integration`: Core tasks (screenshot, resolve-reference, visual-compare, polish)
- `visual-compare-panel`: Toolbar overlay UI
- `scene-visual-panel`: Tab-based visual display

All three assumed references live in `scenes.yml`. This change decouples that.

## Goals

- **Single source of truth** for visual reference metadata per story
- **Persist comparison results** (diff %, pass/fail) between workflow runs
- **Simplify addon discovery** — one `meta.yml` fetch instead of N breakpoint probes
- **Keep scenes.yml pure** — only component composition, no testing metadata
- **Simplify pipeline** — fewer steps, no type dispatch, concrete params

## Non-Goals

- Changing the visual comparison approach (AI-based stays)
- Adding new reference types beyond URL
- Migration tool for existing `reference` arrays

## Decisions

### 1. `designbook/stories/{storyId}/` as root

StoryId is already the universal key across addon, screenshots, and Storybook API. Using it as the directory name creates a 1:1 mapping. Alternatives considered:
- Per-section directories: rejected because components and variants also need references
- Flat file per story: rejected because screenshots are binary and need their own subdirectory

### 2. `meta.yml` instead of `reference.yml`

The file holds more than just reference source — it includes thresholds, last results, and will eventually hold other per-story metadata (e.g., accessibility scores, performance budgets). `meta.yml` leaves room for that.

### 3. Screenshots under `designbook/stories/{storyId}/screenshots/`

Groups all story-level artifacts together. Subdirectories: `reference/` (committed), `current/` (gitignored), `diff/` (gitignored).

### 4. Unified source: always URL with `hasMarkup` flag

All reference sources are normalized to a URL. There is no type dispatch. `capture-reference` always loads a URL via Playwright.

```yaml
reference:
  source:
    url: "https://..."              # the URL to screenshot (always present)
    origin: stitch                  # optional: where the URL came from
    screenId: "projects/.../..."    # optional: for re-resolving (Stitch)
    hasMarkup: true                 # set by origin-specific rules (e.g., Stitch has HTML)
  breakpoints:
    sm: { threshold: 3 }
    xl: { threshold: 5 }
```

The `hasMarkup` flag controls whether `compare-markup` runs. Origins that provide inspectable HTML (Stitch, live URLs) set `hasMarkup: true`. Origins without HTML (Figma exports, static images) leave it unset.

### 5. Pipeline: `intake → storybook-preview → capture → compare → polish`

5 steps, down from 7. `storybook-preview` stays its own step (reused by design-shell, design-screen, etc.). `capture` and `compare` each have two tasks.

**Previous**: `intake → storybook-preview → screenshot → inspect → resolve-reference → visual-compare → polish`
**New**: `intake → storybook-preview → capture → compare → polish`

### 6. Capture step: two tasks, both `each: reference.breakpoints`

| Task | Params |
|---|---|
| `capture-reference` | `url`, `viewportWidth`, `outputPath` |
| `capture-storybook` | `storybookUrl`, `viewportWidth`, `outputPath` |

Both do the same thing: load URL in Playwright at viewport width, save screenshot. `capture-reference` skips if image exists and source URL unchanged.

### 7. Compare step: two tasks, both `each: reference.breakpoints`

| Task | Params | Condition |
|---|---|---|
| `compare-markup` | `referenceUrl`, `storybookUrl`, `breakpoint`, `viewportWidth` | only when `source.hasMarkup: true` |
| `compare-screenshots` | `referencePath`, `currentPath`, `threshold`, `breakpoint` | always |

`compare-markup` inspects both URLs (CSS custom properties, fonts, computed styles, DOM structure) and compares them. Replaces the old `inspect-storybook` + `inspect-stitch` tasks.

`compare-screenshots` does the visual pixel diff and writes `lastDiff` + `lastResult` to `meta.yml`.

### 8. Concrete params replace all type-specific rules

| Rule/Override | Removed because |
|---|---|
| `screenshot-storage` | Paths are task params (`outputPath`) |
| `image-reference` | No type dispatch — everything is a URL |
| `url-reference` | No type dispatch — everything is a URL |
| `inspect-format` | Output schema of `compare-markup` task |
| `stitch-reference` | Stitch resolved to URL by rule |
| `screenshot-stitch` | No Stitch capture override needed |
| `inspect-stitch` | Merged into `compare-markup` |

### 9. Rules

| Rule | Skill | Applies to |
|---|---|---|
| `playwright-session` | designbook | capture + compare steps |
| `guidelines-context` | designbook | all design tasks |
| `resolve-stitch-url` | designbook-stitch | intake — when `origin: stitch`, resolves `screenId` → `source.url` + sets `hasMarkup: true` via MCP `get_screen` |

### 10. Removed files

| File | Reason |
|---|---|
| `design/tasks/resolve-reference.md` | Replaced by `capture-reference` |
| `design/tasks/partials/resolve-design-reference.md` | Interactive resolution obsolete |
| `design/tasks/screenshot.md` | Renamed to `capture-storybook` |
| `design/tasks/inspect-storybook.md` | Merged into `compare-markup` |
| `design/tasks/visual-compare.md` | Replaced by `compare-screenshots` |
| `design/rules/screenshot-storage.md` | Paths are task params |
| `design/rules/image-reference.md` | No type dispatch |
| `design/rules/url-reference.md` | No type dispatch |
| `design/rules/inspect-format.md` | Output schema of compare-markup |
| `designbook-stitch/tasks/screenshot-stitch.md` | Stitch resolved to URL |
| `designbook-stitch/tasks/inspect-stitch.md` | Merged into compare-markup |
| `designbook-stitch/rules/stitch-reference.md` | Replaced by `resolve-stitch-url` rule |

### 11. Affected skills inventory

**Core designbook skill** — new/modified:
- `design/resources/story-meta-schema.md` — **new**: `meta.yml` schema
- `design/resources/scenes-schema.md` — remove `reference` array
- `design/workflows/design-verify.md` — new 5-step pipeline
- `design/tasks/intake--design-verify.md` — create/update `meta.yml`
- `design/tasks/storybook-preview.md` — **kept** as own step (shared across workflows)
- `design/tasks/capture-reference.md` — **new**: URL → Playwright → screenshot, `each: reference.breakpoints`
- `design/tasks/capture-storybook.md` — **rename** from `screenshot.md`, `each: reference.breakpoints`
- `design/tasks/compare-markup.md` — **new**: inspect + compare HTML/CSS of both URLs, `each: reference.breakpoints`, skips when `!hasMarkup`
- `design/tasks/compare-screenshots.md` — **new**: pixel diff, writes results to `meta.yml`, `each: reference.breakpoints`
- `design/tasks/polish.md` — params: `storyId`, `compareResults`

**Stitch integration** — reduced to one rule:
- `designbook-stitch/rules/resolve-stitch-url.md` — **new**: resolves `screenId` → preview URL + `hasMarkup: true`

**Storybook addon**:
- `src/components/VisualCompareTool.tsx` — read `meta.yml` for discovery
- `src/withVisualCompare.ts` — update image URL path
