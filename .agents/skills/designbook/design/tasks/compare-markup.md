---
name: designbook:design:compare-markup
title: "Compare Markup: {scene}"
when:
  steps: [compare-markup]
params:
  scene: ~
  storyId: ~
files:
  - key: design-storybook
    path: designbook/stories/{storyId}/design-storybook.md
    validators: []
  - key: draft-issues
    path: designbook/stories/{storyId}/issues/draft/diff.json
    validators: []
reads:
  - path: designbook/stories/{storyId}/design-reference.md
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Compare Markup

Single-step markup comparison. Extracts design characteristics from the Storybook URL using the same extraction rule as intake, then diffs against the existing `design-reference.md`.

## Precondition

Read `design-reference.md` from the story directory. If it does not exist, skip this task — there is nothing to compare against.

```bash
_debo story --scene ${scene}
```

Read `reference.source.hasMarkup` from `meta.yml`. If not `true`, skip this task entirely.

## Phase 1: Extract from Storybook

Apply the `extract-reference` rule to the **Storybook URL** (from `_debo story --scene ${scene}` → `url` field).

The extract-reference rule writes the result via `write-file --key design-storybook --flush` to `$STORY_DIR/design-storybook.md` — same format as `design-reference.md`.

## Phase 2: Diff

Compare `design-reference.md` against `design-storybook.md` section by section:

| Section | What to compare |
|---------|----------------|
| **Fonts** | Family names, weights, sources |
| **Color Palette** | Hex values and their usage context |
| **Layout** | Container max-width, edge padding, spacing |
| **Landmark Structure** | Number of rows/sections, background colors, heights, content summaries |
| **Interactive Patterns** | Button/link styles, border-radius, colors |

## Phase 3: Evaluate and Create Issues

For each difference found:

| Severity | Meaning | Example |
|----------|---------|---------|
| `critical` | Fundamental breakage | Missing landmark section, wrong font family, absent navigation |
| `major` | Visible deviation | Wrong background color, font size off >4px, missing interactive pattern |
| `minor` | Small deviation — **dropped** | 1px rounding, slight padding diff |

Only `critical` and `major` become issues.

Write draft issues via the workflow CLI with `--flush`:

```bash
cat <<'EOF' | _debo workflow write-file $WORKFLOW_NAME $TASK_ID --key draft-issues --flush
[...issues array...]
EOF
```

Format of `$STORY_DIR/issues/draft/diff.json`:

```json
[
  {
    "source": "extraction",
    "severity": "major",
    "check": "markup",
    "label": "Footer Section 2",
    "category": "layout",
    "property": "backgroundColor",
    "expected": "#056336",
    "actual": "#044a29",
    "description": "Footer Section 2: backgroundColor von #044a29 auf #056336 ändern",
    "file_hint": "components/footer/footer.twig"
  }
]
```

**Issue descriptions must be actionable:**
- WHAT to change (element + property + concrete value)
- FROM → TO (actual → expected)
- WHICH file is affected (`file_hint`)

If no issues found, write an empty array `[]`.

## Output

```
## Compare Markup: {scene}

Extracted design from Storybook → design-storybook.md
Compared against design-reference.md
Found N issues (X critical, Y major)

Draft issues written — triage will consolidate and publish.
```
