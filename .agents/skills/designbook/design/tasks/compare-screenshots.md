---
name: designbook:design:compare-screenshots
title: "Compare Screenshots: {scene} ({breakpoint}/{region})"
when:
  steps: [compare]
  type: screenshot
priority: 20
params:
  scene: ~
  storyId: ~
  breakpoint: ~
  region: ~
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
  - path: $DESIGNBOOK_DATA/design-system/guidelines.yml
    optional: true
---

# Compare Screenshots

Captures the Storybook screenshot, compares it with the reference, and writes draft issues for triage.

## Phase 1: Capture Storybook Screenshot

1. **Resolve Storybook URL** from `DeboStory` entity:
   ```bash
   _debo story --scene ${scene}
   ```
   Extract the Storybook iframe URL from the story JSON output.

2. **Capture screenshot** using the `playwright-capture` rule:
   - Resolve viewport width from `design-tokens.yml`
   - Use selector from the check's `selector` field
   - Full-page CLI for `full` region, element Node API for named regions (header, footer)
   - Save to `designbook/stories/${storyId}/screenshots/current/${breakpoint}--${region}.png`

3. **Verify** by reading the captured image.

## Phase 2: Compare

1. **Read both images:**
   - Reference: `${DESIGNBOOK_DATA}/stories/${storyId}/screenshots/reference/${breakpoint}--${region}.png`
   - Current: `${DESIGNBOOK_DATA}/stories/${storyId}/screenshots/current/${breakpoint}--${region}.png`

   If either image is missing, skip with a warning.

2. **Collect context:**
   - Design tokens from `design-tokens.yml`
   - Guidelines from `guidelines.yml`

3. **Compare visually** using multimodal capabilities. Evaluate layout, colors, typography, spacing. Focus on the specific element for named regions.

   Severity: **Critical** (structure wrong), **Major** (colors/fonts off), **Minor** (spacing/opacity).

## Phase 3: Write Draft Issues

Write the issues as a draft JSON file — they are **not** published to meta yet. Triage will consolidate and publish them.

```
designbook/stories/${storyId}/issues/draft/${breakpoint}--${region}.json
```

Format:
```json
[
  {
    "source": "screenshots",
    "severity": "major",
    "check": "${breakpoint}--${region}",
    "description": "Header: Hintergrundfarbe weicht ab — erwartet helles Grau (#F5F5F5), aktuell weiß (#FFFFFF). Betrifft components/header/header.twig",
    "file_hint": "components/header/header.twig",
    "details": "Visueller Vergleich zeigt abweichende Hintergrundfarbe im Header-Bereich"
  }
]
```

**Issue-Beschreibungen müssen actionable sein:**
- WAS weicht ab (konkretes Element + Property)
- Erwarteter vs. aktueller Wert (soweit erkennbar)
- WELCHE Datei betroffen ist (`file_hint`)
- Kurze Begründung warum es ein Issue ist

If no issues found, write an empty array `[]`.

## Output

```
## Compare: {scene} ({breakpoint}/{region})

Storybook screenshot captured.
Visual comparison: 2 issues found (1 major, 1 critical).
Draft issues written — triage will consolidate and publish.
```

> **Note**: This is an AI-based visual comparison using multimodal capabilities, not a pixel-level diff.
