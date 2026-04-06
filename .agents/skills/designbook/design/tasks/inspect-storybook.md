---
name: designbook:design:inspect-storybook
priority: 10
when:
  steps: [inspect]
params:
  scene: ~
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Inspect Storybook

Extracts structured data from a rendered Storybook story using playwright-cli sessions. This data supplements screenshots for the compare step.

## Prerequisites

- Storybook must be running (handled by `storybook-preview` in the `screenshot` step)
- The scene's storyId must be resolved

## Execution

1. **Resolve the story URL**
   ```bash
   _debo resolve-url --scene "{{ scene }}"
   ```
   Extract the `iframeUrl` from the output.

2. **Open a playwright-cli session**
   ```bash
   npx playwright-cli -s=inspect open <iframeUrl>
   ```
   Wait for the page to load completely.

3. **Extract CSS custom properties**
   ```bash
   npx playwright-cli -s=inspect eval "JSON.stringify(Object.fromEntries(Array.from(document.querySelectorAll(':root, [data-theme]')).flatMap(el => Array.from(getComputedStyle(el)).filter(p => p.startsWith('--')).map(p => [p, getComputedStyle(el).getPropertyValue(p).trim()]))))"
   ```

4. **Check font loading**
   Read expected fonts from design-tokens.yml `semantic.typography` section. For each font family:
   ```bash
   npx playwright-cli -s=inspect eval "JSON.stringify({family: '<fontFamily>', loaded: document.fonts.check('16px <fontFamily>')})"
   ```

5. **Extract computed styles from key elements**
   ```bash
   npx playwright-cli -s=inspect eval "JSON.stringify(Array.from(document.querySelectorAll('h1,h2,h3,h4,p,section,header,footer,nav,[class*=component]')).slice(0,20).map(el => ({selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''), styles: {color: getComputedStyle(el).color, fontFamily: getComputedStyle(el).fontFamily, fontSize: getComputedStyle(el).fontSize, fontWeight: getComputedStyle(el).fontWeight, backgroundColor: getComputedStyle(el).backgroundColor, borderRadius: getComputedStyle(el).borderRadius}})))"
   ```

6. **Capture console errors**
   ```bash
   npx playwright-cli -s=inspect eval "window.__consoleErrors || []"
   ```
   Note: Console error capture requires injecting a listener before page load. If not available, report an empty array.

7. **Write inspect output**
   Save the collected data to the step output directory:
   ```
   designbook/workflows/<workflow>/steps/inspect/inspect-storybook.json
   ```

   Format:
   ```json
   {
     "source": "inspect-storybook",
     "url": "<iframeUrl>",
     "customProperties": { "--color-primary": "#1a1a2e", ... },
     "fonts": [
       { "family": "Inter", "weight": "400", "loaded": true },
       ...
     ],
     "computedStyles": {
       "h1.section-title": { "color": "rgb(26,26,46)", "fontFamily": "Inter", ... }
     },
     "consoleErrors": []
   }
   ```

8. **Keep session open** for subsequent inspect tasks in the same step. The last task in the step closes it:
   ```bash
   npx playwright-cli -s=inspect close
   ```

## Output

- `inspect-storybook.json` — structured data consumed by the `compare` step
- The playwright-cli session remains open for reuse by extension tasks (e.g., `inspect-stitch`)
