---
name: designbook:design:compare-markup
title: "Compare Markup: {scene} ({breakpoint})"
when:
  steps: [compare]
  type: markup
priority: 10
params:
  scene: ~
  storyId: ~
  breakpoint: ~
files:
  - key: extraction-spec
    path: $DESIGNBOOK_DATA/stories/{storyId}/extractions/{breakpoint}--spec.yml
    validators: []
  - key: extraction-reference
    path: $DESIGNBOOK_DATA/stories/{storyId}/extractions/{breakpoint}--reference.json
    validators: []
  - key: extraction-storybook
    path: $DESIGNBOOK_DATA/stories/{storyId}/extractions/{breakpoint}--storybook.json
    validators: []
  - key: draft-issues
    path: $DESIGNBOOK_DATA/stories/{storyId}/issues/draft/{breakpoint}--markup.json
    validators: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Compare Markup

Three-phase extraction-based markup comparison with integrated fix. AI generates an extraction spec, Playwright extracts mechanically, AI evaluates the diff, creates issues in meta, and fixes them.

## Precondition

```bash
_debo story --scene ${scene}
```

Read `reference.source.hasMarkup`. If not `true`, skip this task entirely.

## Phase 1: AI Generates Extraction Spec

1. **Open Playwright session on reference URL** using the Node API:
   ```javascript
   const { chromium } = require('playwright');
   const browser = await chromium.launch();
   const page = await browser.newPage({ viewport: { width: viewportWidth, height: 1600 } });
   await page.goto(referenceUrl, { waitUntil: 'networkidle' });
   await page.waitForTimeout(3000);
   ```

2. **Retrieve DOM summary**: tag names, class names, landmark roles, nesting depth — no computed styles yet.

3. **Inspect reference screenshot** visually to understand the page layout.

4. **Generate `extraction-spec.yml`** tailored to this specific page:

   ```yaml
   elements:
     - selector: ".hero-section h1"
       label: "Hero Heading"
       category: typography
       extract: [fontSize, fontWeight, fontFamily, lineHeight, color]
     - selector: "nav.main-nav"
       label: "Main Navigation"
       category: layout
       extract: [display, gap, alignItems]
       content_check: true
     - selector: ".card-grid"
       label: "Card Grid"
       category: layout
       extract: [display, gridTemplateColumns, gap]
       match_children: true
   ```

   **Spec fields:**

   | Field | Required | Description |
   |-------|----------|-------------|
   | `selector` | yes | CSS selector targeting the element(s) |
   | `label` | yes | Human-readable name for issues |
   | `category` | yes | One of: `typography`, `interactive`, `layout`, `media`, `decoration` |
   | `extract` | yes | List of CSS computed style property names |
   | `content_check` | no | Also extract text content, link labels, image sources |
   | `match_children` | no | Also extract styles from direct children |

   **Property selection by element role:**
   - Typography (headings, paragraphs): `fontSize`, `fontWeight`, `fontFamily`, `lineHeight`, `color`, `letterSpacing`, `textTransform`
   - Interactive (buttons, links, inputs): `backgroundColor`, `color`, `borderRadius`, `padding`, `fontSize`, `border`
   - Layout (sections, grids, flex): `display`, `flexDirection`, `gap`, `gridTemplateColumns`, `padding`, `maxWidth`
   - Media (images, video): `width`, `height`, `objectFit`, `aspectRatio`, `borderRadius`
   - Decorative: `boxShadow`, `opacity`, `transform` — only when visually prominent

   **Selector rules:**
   - Prefer class-based or landmark-based selectors over tag-only selectors
   - Scope selectors to visible content (not Storybook chrome)

   **Focus on:**
   - Elements that define the page's visual identity (hero, headings, CTAs)
   - Elements where design-system tokens are expected
   - Elements with distinct visual treatments

   **Skip:**
   - Generic wrapper divs with no visual styling
   - Repeated identical elements (extract one representative, note count)
   - Browser-default styled elements

5. **Write spec** to `designbook/stories/${storyId}/extractions/${breakpoint}--spec.yml`

### Spec Reuse

If `extractions/${breakpoint}--spec.yml` already exists from a previous run, the AI MAY reuse or refine it instead of generating from scratch.

## Phase 2: Mechanical Extraction via Playwright

For each element in the extraction spec:

**Important:** Write extraction scripts to the workspace root directory (where `node_modules/` is located), not to `/tmp`. Playwright's `require('playwright')` resolves from the script's directory.

1. **On reference URL** (session already open):
   - `querySelectorAll(selector)` — record match count
   - `getComputedStyle()` for each property in `extract`
   - If `content_check: true`: extract `textContent`, link `href`/labels, `img.src`/`alt`
   - If `match_children: true`: repeat for direct children

2. **Navigate to Storybook URL** (reuse session, set same viewport):
   - Same extraction steps as above

3. **Write extraction JSONs:**
   - `designbook/stories/${storyId}/extractions/${breakpoint}--reference.json`
   - `designbook/stories/${storyId}/extractions/${breakpoint}--storybook.json`

## Phase 3: Diff, Evaluation, and Issue Creation

1. **Compute diff in memory** — for each element (matched by `label`):
   - Each style property compared: `match`, `mismatch`, `missing`, `count_mismatch`

2. **AI evaluates severity:**

   | Severity | Meaning | Example |
   |----------|---------|---------|
   | `critical` | Fundamental breakage | Missing section, wrong font family, nav absent |
   | `major` | Visible deviation | Font size off >4px, wrong brand color, broken grid |
   | `minor` | Small deviation — **dropped** | 1px rounding, slight line-height diff |
   | `info` | Notable but acceptable — **dropped** | Different fallback font |

   Only `critical` and `major` become issues.

3. **Write draft issues** — not published to meta yet. Triage will consolidate and publish.

   ```
   designbook/stories/${storyId}/issues/draft/${breakpoint}--markup.json
   ```

   Format:
   ```json
   [
     {
       "source": "extraction",
       "severity": "major",
       "check": "${breakpoint}--markup",
       "label": "Hero Heading",
       "category": "typography",
       "property": "fontSize",
       "expected": "3rem",
       "actual": "2.5rem",
       "description": "Hero Heading: fontSize von 2.5rem auf 3rem ändern — betrifft components/hero/hero.twig",
       "file_hint": "components/hero/hero.twig"
     }
   ]
   ```

   **Issue-Beschreibungen müssen actionable sein:**
   - WAS ändern (Element + Property + konkreter Wert)
   - VON → NACH (actual → expected)
   - WELCHE Datei betroffen ist (`file_hint`)
   - Extraction-Issues haben exakte Werte — diese immer angeben

   If no issues found, write an empty array `[]`.

## Output

```
## Compare Markup: {scene} ({breakpoint})

Phase 1: Generated extraction spec (12 elements)
Phase 2: Extracted styles from both URLs
Phase 3: Found 3 issues (1 critical, 2 major)

Draft issues written — triage will consolidate and publish.
```
