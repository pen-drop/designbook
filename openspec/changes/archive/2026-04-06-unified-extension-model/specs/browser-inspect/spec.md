## ADDED Requirements

### Requirement: playwright-cli replaces MCP DevTools for browser inspection

The visual comparison pipeline SHALL use `playwright-cli` for all browser automation instead of MCP DevTools.

#### Scenario: Session-based browser automation
- **WHEN** the `inspect` step needs to extract data from a running Storybook
- **THEN** it uses `playwright-cli` with a named session:
  ```bash
  npx playwright-cli -s=vc open http://localhost:<port>/iframe.html?id=<story>
  npx playwright-cli -s=vc eval "document.querySelector('.component').computedStyleMap()"
  npx playwright-cli -s=vc close
  ```

#### Scenario: Session persists across task boundaries
- **WHEN** `inspect-storybook` (priority 10) opens a session with `-s=vc`
- **AND** `inspect-reference` (priority 20) runs next in the same step
- **THEN** `inspect-reference` can reuse the same session (`-s=vc`)
- **AND** the last task in the step closes the session

### Requirement: inspect-storybook task extracts structured data

The `inspect-storybook` task SHALL extract CSS custom properties, computed styles, font loading status, and console errors from the rendered Storybook story.

#### Scenario: CSS custom property extraction
- **WHEN** `inspect-storybook` runs against a rendered story
- **THEN** it extracts all `--` prefixed CSS custom properties from the document root
- **AND** writes them to `inspect-storybook.json` in the step output directory

#### Scenario: Font loading verification
- **WHEN** `inspect-storybook` runs
- **THEN** it queries `document.fonts.check()` for each expected font family
- **AND** records load status (loaded/failed/pending) per font

#### Scenario: Computed style extraction
- **WHEN** `inspect-storybook` runs
- **THEN** it extracts computed styles (color, font-family, font-size, font-weight, background-color, border-radius) from key elements
- **AND** stores element selector → computed style mappings

#### Scenario: Console error capture
- **WHEN** `inspect-storybook` runs
- **THEN** it captures any console errors or warnings emitted during page load
- **AND** includes them in the inspect output

### Requirement: Inspect output format

Inspect tasks SHALL write JSON files following a consistent structure.

#### Scenario: inspect-storybook.json format
- **WHEN** `inspect-storybook` completes
- **THEN** it writes:
  ```json
  {
    "source": "inspect-storybook",
    "url": "http://localhost:45787/iframe.html?id=...",
    "customProperties": { "--color-primary": "#1a1a2e", ... },
    "fonts": [
      { "family": "Inter", "weight": "400", "status": "loaded" },
      ...
    ],
    "computedStyles": {
      ".section-header h2": { "color": "rgb(26, 26, 46)", "font-family": "Inter", ... }
    },
    "consoleErrors": []
  }
  ```

#### Scenario: Extension inspect output
- **WHEN** `inspect-stitch` (an extension task) runs
- **THEN** it writes `inspect-stitch.json` with:
  ```json
  {
    "source": "inspect-stitch",
    "url": "https://stitch-preview.example.com/...",
    "customProperties": { ... },
    "fonts": [ ... ],
    "computedStyles": { ... },
    "htmlDiff": { ... }
  }
  ```
- **AND** extension-specific fields (like `htmlDiff`) are allowed

### Requirement: compare task consumes all inspect outputs

The `compare` task SHALL load all `inspect-*.json` files from the step output directory and include them alongside screenshots in its AI evaluation.

#### Scenario: Compare with inspect data
- **WHEN** the `compare` step runs
- **AND** `inspect-storybook.json` and `inspect-stitch.json` exist from the prior `inspect` step
- **THEN** the compare task loads both files
- **AND** provides them as context for the AI comparison alongside the screenshot images

#### Scenario: Compare without inspect data (graceful degradation)
- **WHEN** the `compare` step runs
- **AND** no `inspect-*.json` files exist (inspect step was skipped or failed)
- **THEN** the compare task runs normally using only screenshot images
- **AND** no error is emitted

### Requirement: Simplified 4-step visual pipeline

The visual comparison pipeline SHALL use 4 steps: `screenshot`, `inspect`, `compare`, `polish`.

#### Scenario: Full pipeline execution
- **WHEN** a visual comparison workflow runs
- **THEN** steps execute in order:
  1. `screenshot` — capture reference and actual images
  2. `inspect` — extract structured data from rendered pages
  3. `compare` — AI evaluates screenshots + inspect data
  4. `polish` — fix loop for identified issues

#### Scenario: Pipeline without inspect step
- **WHEN** a project has no inspect tasks matching (no `when` conditions met)
- **THEN** the pipeline runs: `screenshot` → `compare` → `polish`
- **AND** `inspect` step is skipped (no tasks resolved)

### Requirement: playwright-cli session management rules

Shared rules SHALL govern session lifecycle and cleanup.

#### Scenario: playwright-session rule
- **WHEN** `playwright-session` rule is active
- **THEN** it mandates:
  - Sessions MUST use the naming convention `-s=<workflow-name>`
  - Sessions MUST be closed in the last task of the step that opened them
  - If a task fails, the session MUST still be closed (error handling)

#### Scenario: screenshot-storage rule
- **WHEN** `screenshot-storage` rule is active
- **THEN** it mandates:
  - Screenshots are stored in `designbook/workflows/<workflow>/steps/<step>/screenshots/`
  - Reference screenshots use `<story-id>-reference.png`
  - Actual screenshots use `<story-id>-actual.png`
