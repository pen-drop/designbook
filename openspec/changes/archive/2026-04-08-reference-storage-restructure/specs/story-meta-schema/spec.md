## NEW Requirements

### Requirement: Story meta.yml schema

Each story with visual references has a `meta.yml` file at `designbook/stories/{storyId}/meta.yml`.

```yaml
reference:
  source:
    url: string           # URL to screenshot (always present)
    origin: string        # optional: where the URL came from (e.g., "stitch", "figma", "manual")
    screenId: string      # optional: for re-resolving (e.g., Stitch screen ID)
    hasMarkup: boolean    # optional: true if reference URL serves inspectable HTML
  breakpoints:
    {breakpointName}:
      threshold: number   # diff threshold in % (default: 3)
      lastDiff: number | null
      lastResult: pass | fail | null
```

`hasMarkup` is set by origin-specific rules during intake. Origins with inspectable HTML (Stitch, live URLs) set `hasMarkup: true`. Origins without (Figma exports, static images) leave it unset. This flag controls whether `compare-markup` runs.

#### Scenario: Intake creates meta.yml

- **GIVEN** a scene is selected for visual verification
- **WHEN** the user configures reference source and breakpoints during intake
- **THEN** `designbook/stories/{storyId}/meta.yml` is created with `reference.source` and `reference.breakpoints`
- **AND** each breakpoint entry has `threshold` (user-specified or default 3), `lastDiff: null`, `lastResult: null`

#### Scenario: compare-screenshots writes results back

- **GIVEN** `meta.yml` exists with breakpoint entries
- **WHEN** `compare-screenshots` completes for a breakpoint
- **THEN** `meta.yml` → `reference.breakpoints.{bp}.lastDiff` is updated with the computed diff percentage
- **AND** `reference.breakpoints.{bp}.lastResult` is set to `pass` or `fail` based on threshold comparison

#### Scenario: Missing meta.yml graceful fallback

- **GIVEN** a story has no `meta.yml`
- **WHEN** any task attempts to read reference metadata
- **THEN** the task treats the story as having no references (skip, don't error)

### Requirement: Pipeline — `intake → storybook-preview → capture → compare → polish`

5 steps. `storybook-preview` is its own step, shared across workflows (design-verify, design-shell, design-screen, etc.).

### Requirement: Capture step — two parameterized iterable tasks

Both tasks: `each: reference.breakpoints`.

#### capture-reference

| Param | Source | Description |
|---|---|---|
| `url` | `meta.yml` → `reference.source.url` | URL to screenshot |
| `viewportWidth` | design-tokens.yml | Breakpoint pixel width |
| `outputPath` | computed | `designbook/stories/{storyId}/screenshots/reference/{bp}.png` |

Single implementation: loads URL via Playwright at `viewportWidth`, saves screenshot. No type dispatch — source is always a URL. Skips if `outputPath` exists and `source.url` unchanged.

#### capture-storybook

| Param | Source | Description |
|---|---|---|
| `storybookUrl` | Storybook instance | Story URL |
| `viewportWidth` | design-tokens.yml | Breakpoint pixel width |
| `outputPath` | computed | `designbook/stories/{storyId}/screenshots/current/{bp}.png` |

#### Scenario: capture-reference screenshots URL at breakpoint width

- **GIVEN** `meta.yml` has `source.url: "https://..."` and breakpoint `xl` (viewportWidth: 1280)
- **WHEN** `capture-reference` runs with params `{ url: '...', viewportWidth: 1280, outputPath: '...' }`
- **THEN** Playwright loads URL at 1280px viewport and saves screenshot to `outputPath`

#### Scenario: capture-reference skips existing reference

- **GIVEN** `outputPath` already exists and `source.url` is unchanged
- **WHEN** `capture-reference` runs for that breakpoint
- **THEN** the existing image is kept, no re-download

#### Scenario: Stitch source resolved by rule at intake

- **GIVEN** `meta.yml` has `source.origin: stitch` and `source.screenId: "projects/.../screens/..."`
- **WHEN** the `resolve-stitch-url` rule ran during intake
- **THEN** it called `get_screen(screenId)`, wrote the preview URL as `source.url`, and set `hasMarkup: true`
- **AND** `capture-reference` sees only the URL — no Stitch-specific logic needed

#### Scenario: capture-storybook captures current render

- **WHEN** `capture-storybook` runs with params `{ storybookUrl: '...', viewportWidth: 640, outputPath: '...' }`
- **THEN** Storybook is rendered at 640px viewport and saved to `outputPath`

### Requirement: Compare step — two parameterized iterable tasks

Both tasks: `each: reference.breakpoints`.

#### compare-markup

| Param | Source | Description |
|---|---|---|
| `referenceUrl` | `meta.yml` → `reference.source.url` | Reference URL to inspect |
| `storybookUrl` | Storybook instance | Storybook story URL |
| `breakpoint` | `each` iterator | Breakpoint name |
| `viewportWidth` | design-tokens.yml | Breakpoint pixel width |

Inspects both URLs via Playwright: CSS custom properties, fonts, computed styles, DOM structure. Compares the extracted data. **Only runs when `source.hasMarkup: true`.**

Replaces the old `inspect-storybook` + `inspect-stitch` tasks — one task inspects both sides.

#### compare-screenshots

| Param | Source | Description |
|---|---|---|
| `referencePath` | computed | `designbook/stories/{storyId}/screenshots/reference/{bp}.png` |
| `currentPath` | computed | `designbook/stories/{storyId}/screenshots/current/{bp}.png` |
| `threshold` | `meta.yml` → `reference.breakpoints.{bp}.threshold` | Diff threshold in % |
| `breakpoint` | `each` iterator | Breakpoint name |

Pixel diff between reference and current screenshots. Writes `lastDiff` and `lastResult` to `meta.yml`. **Always runs.**

#### polish

| Param | Source | Description |
|---|---|---|
| `storyId` | workflow context | Story identifier |
| `compareResults` | compare step output | Per-breakpoint diff results from both compare tasks |

#### Scenario: compare-markup runs for Stitch reference

- **GIVEN** `meta.yml` has `source.hasMarkup: true`
- **WHEN** `compare-markup` runs for breakpoint `sm`
- **THEN** it inspects both `referenceUrl` and `storybookUrl` at 640px viewport
- **AND** outputs CSS/font/style comparison data

#### Scenario: compare-markup skips for Figma reference

- **GIVEN** `meta.yml` has no `hasMarkup` field (or `hasMarkup: false`)
- **WHEN** the compare step runs
- **THEN** `compare-markup` is skipped
- **AND** `compare-screenshots` still runs

#### Scenario: compare-screenshots writes results to meta.yml

- **WHEN** `compare-screenshots` runs with params `{ threshold: 3, referencePath: '...', currentPath: '...' }`
- **THEN** it computes pixel diff percentage
- **AND** writes `lastDiff` and `lastResult` to `meta.yml` → `reference.breakpoints.{bp}`

### Requirement: Screenshot storage paths

All screenshot artifacts for a story live under `designbook/stories/{storyId}/screenshots/`. Paths are computed as task params.

| Subdirectory | Content | Git status |
|---|---|---|
| `reference/` | Baseline images from resolved references | Committed |
| `current/` | Latest Storybook capture | Gitignored |
| `diff/` | Pixel diff output | Gitignored |

File naming: `{breakpointName}.png` (e.g., `sm.png`, `xl.png`).

### Requirement: Rules

| Rule | Skill | Applies to | Description |
|---|---|---|---|
| `playwright-session` | designbook | capture + compare steps | Cross-task Playwright session lifecycle |
| `guidelines-context` | designbook | all design tasks | Loads `guidelines.yml` as context |
| `resolve-stitch-url` | designbook-stitch | intake | When `origin: stitch`: resolves `screenId` → `source.url` + sets `hasMarkup: true` via MCP `get_screen` |

## REMOVED Requirements

### Requirement: resolve-design-reference partial task

**Reason**: Interactive resolution obsolete. Reference source is set once in `meta.yml` during intake.

### Requirement: resolve-reference task and pipeline stage

**Reason**: Replaced by `capture-reference`. References are captured per-breakpoint with explicit params.

### Requirement: inspect-storybook task

**Reason**: Merged into `compare-markup` which inspects both reference and Storybook URLs in one task.

### Requirement: inspect-stitch task

**Reason**: Merged into `compare-markup`. No separate Stitch inspection needed — `compare-markup` inspects any URL.

### Requirement: visual-compare task

**Reason**: Replaced by `compare-screenshots` with explicit params and `meta.yml` write-back.

### Requirement: screenshot-stitch task and stitch-reference rule

**Reason**: Stitch is resolved to a preview URL by the `resolve-stitch-url` rule during intake. `capture-reference` handles URLs — no Stitch-specific capture logic.

### Requirement: screenshot-storage rule

**Reason**: Paths are task params (`outputPath`).

### Requirement: image-reference rule

**Reason**: No type dispatch. All sources are URLs.

### Requirement: url-reference rule

**Reason**: No type dispatch. `capture-reference` always loads a URL via Playwright.

### Requirement: inspect-format rule

**Reason**: Output schema of `compare-markup` task.

## MODIFIED Requirements

### Requirement: scenes-schema.md — remove reference array

The `reference` array is removed from the scene YAML schema. Scene files only describe component composition (`components`, `slots`, `theme`, `props`).

**Previous**: Scene files contained an optional `reference` array with `type`, `url`, `breakpoint`, `threshold`.

**New**: No `reference` field in scene files. Visual reference metadata lives in `meta.yml`.

#### Scenario: Scene file without reference

- **GIVEN** a scenes.yml file
- **WHEN** it is parsed by `buildSceneModule`
- **THEN** any `reference` key is ignored (no error, no processing)
