# Optimize extract-reference: Structured JSON + Vision-Enhanced Extraction

## Goal

Improve the quality and usability of design reference data extracted by the `extract-reference` task. The extracted data drives 1:1 reproduction of screens and sites — better extraction means more accurate components, scenes, and design tokens.

## Problems Solved

### 1. Markdown Roundtrip (data flow)

Current: Playwright eval → structured JSON → written as Markdown tables → intake parses Markdown back → builds `design_hint` object. Each conversion is lossy and fragile.

New: Playwright eval → structured JSON → written as `design-reference.json` → consumers read JSON directly. No lossy conversion.

### 2. Shallow Extraction (data quality)

Current eval scripts extract only basics: font-family (no scale), bg+text colors (no borders/shadows), no CSS variables, no grid/flex detection, no spacing system, text truncated at 100 chars.

New: deeper eval scripts covering full typography scale, spacing system, CSS custom properties, box model (border-radius, box-shadow, borders), and layout detection (flex/grid, gap, align).

### 3. No Semantic Understanding (token quality)

Current: Playwright gives exact values (`#1a1a2e`) but no semantic meaning. The intake must guess token names from positional context.

New: Vision pass (AI analyzing the screenshot) provides semantic understanding — "this is the brand primary color", "this is the hero headline font". Combined with exact Playwright values, this produces high-quality token assignments.

## Extraction Strategy

Two strategies, both always include vision:

- **`playwright+vision`** — Playwright extracts exact DOM values, Vision provides semantic understanding. Best quality.
- **`vision`** — Screenshot only, all values estimated by AI. Fallback when no markup is available.

There is no "playwright only" strategy. The AI always analyzes the screenshot — vision is the baseline, Playwright is the enhancement.

### Flow

```
Phase 1 — Screenshot (always)
  → reference-full.png
  → reference-header.png (via snapshot ref, when header landmark exists)
  → reference-footer.png (via snapshot ref, when footer landmark exists)

Phase 2 — Playwright eval calls (when hasMarkup: true)
  eval 1: Fonts           → [{family, source, weights, styles}]
  eval 2: Typography      → [{element, font_family, font_size, line_height, letter_spacing, font_weight, color}]
  eval 3: Colors          → [{hex, usage}] (incl. borders, shadows, gradients)
  eval 4: CSS Variables   → [{name, value}] (from :root and all custom properties)
  eval 5: Spacing         → {container_max_width, edge_padding, section_gap, values[]}
  eval 6: Landmarks       → {header: {rows[]}, footer: {rows[]}} (incl. layout, gap per row)
  eval 7: Interactive     → [{element, selector, bg, color, border_radius, padding, font, box_shadow, border}]
  eval 8: Box Model       → collect border-radius, box-shadow values → radii[] for tokens

Phase 3 — Vision + Merge (always)
  AI receives: screenshot(s) + Playwright JSON (if available)
  AI produces:
    - Token assignment: which color = primary/secondary/accent/surface/...
    - Font assignment: which font = heading/body/mono/...
    - Spacing rhythm: identify base unit (e.g. 8px system)
    - UI pattern recognition: "Card Grid", "Hero Banner", "Sticky Nav"
  When Playwright data exists: exact values + semantic names
  When no Playwright data: estimated values + semantic names

Phase 4 — Write output
  → $STORY_DIR/design-reference.json (primary output)
  → $STORY_DIR/reference-full.png
  → $STORY_DIR/reference-header.png
  → $STORY_DIR/reference-footer.png
```

All Playwright interaction uses `npx playwright-cli` commands (eval, screenshot, snapshot). Individual focused eval calls, not a single monolithic script.

## DesignReference Schema

New schema in `schemas.yml`. Primary output of extract-reference, read by all intakes and create-tokens.

```yaml
DesignReference:
  type: object
  required: [source, extracted, strategy]
  properties:
    source: { type: string }
    extracted: { type: string }
    strategy: { type: string, enum: [vision, playwright+vision] }

    fonts:
      type: array
      items:
        type: object
        properties:
          family: { type: string }
          source: { type: string }
          weights: { type: array, items: { type: number } }
          styles: { type: array, items: { type: string } }

    typography:
      type: array
      items:
        type: object
        properties:
          element: { type: string }
          font_family: { type: string }
          font_size: { type: string }
          line_height: { type: string }
          letter_spacing: { type: string }
          font_weight: { type: number }
          color: { type: string }

    colors:
      type: array
      items:
        type: object
        properties:
          hex: { type: string }
          usage: { type: array, items: { type: string } }

    css_variables:
      type: array
      items:
        type: object
        properties:
          name: { type: string }
          value: { type: string }

    spacing:
      type: object
      properties:
        container_max_width: { type: string }
        edge_padding: { type: string }
        section_gap: { type: string }
        values: { type: array, items: { type: string } }

    landmarks:
      type: object
      properties:
        header:
          type: object
          properties:
            rows:
              type: array
              items:
                type: object
                properties:
                  tag: { type: string }
                  bg: { type: string }
                  height: { type: string }
                  padding: { type: string }
                  content: { type: string }
                  layout: { type: string }
                  gap: { type: string }
        footer:
          type: object
          properties:
            rows:
              type: array
              items:
                type: object
                properties:
                  tag: { type: string }
                  bg: { type: string }
                  height: { type: string }
                  padding: { type: string }
                  content: { type: string }
                  layout: { type: string }
                  gap: { type: string }

    interactive:
      type: array
      items:
        type: object
        properties:
          element: { type: string }
          selector: { type: string }
          bg: { type: string }
          color: { type: string }
          border_radius: { type: string }
          padding: { type: string }
          font: { type: string }
          box_shadow: { type: string }
          border: { type: string }

    tokens:
      type: object
      properties:
        colors:
          type: object
        fonts:
          type: object
        spacing:
          type: array
          items: { type: string }
        radii:
          type: array
          items: { type: string }
```

## DesignHint Schema

New schema in `schemas.yml`. Component-level subset of DesignReference, assembled by the intake and consumed by create-component.

```yaml
DesignHint:
  type: object
  properties:
    landmark: { type: string }
    rows:
      type: array
      items:
        type: object
        properties:
          bg: { type: string }
          height: { type: string }
          layout: { type: string }
          gap: { type: string }
          padding: { type: string }
          content: { type: string }
    fonts:
      type: object
    interactive:
      type: array
      items:
        type: object
        properties:
          element: { type: string }
          bg: { type: string }
          color: { type: string }
          border_radius: { type: string }
          padding: { type: string }
          box_shadow: { type: string }
    tokens:
      type: object
```

The `Component` schema's `design_hint` field changes from `{ type: object }` to `$ref: #/DesignHint`.

## File Changes

### New schemas in `schemas.yml`

| Schema | Purpose |
|--------|---------|
| `DesignReference` | Full structured extraction output |
| `DesignHint` | Component-level design data subset |

### Modified tasks

| Task | Change |
|------|--------|
| `extract-reference.md` | New extraction flow: playwright+vision strategy, `design-reference.json` output, region screenshots, token extraction. Remove `design-reference.md` output. |
| `intake--design-component.md` | Read `design-reference.json` instead of `.md`. Build `design_hint` from JSON. Attach region screenshot per component. |
| `intake--design-shell.md` | Same: `.json` instead of `.md`. |
| `intake--design-screen.md` | Same: `.json` instead of `.md`. |
| `intake--design-verify.md` | Read reference URL from `.json` instead of `.md`. |

### Modified schemas

| Schema | Change |
|--------|--------|
| `Component.design_hint` | `{ type: object }` → `$ref: #/DesignHint` |

### New reads

| Task | New read |
|------|----------|
| `create-tokens` (in design-tokens workflow) | `$STORY_DIR/design-reference.json` — uses `tokens` block as input for token generation |

### Removed outputs

| Output | Reason |
|--------|--------|
| `design-reference.md` | Replaced by `design-reference.json`. No consumer reads Markdown anymore. |

## Result Flow

```
extract-reference
  ├─ design-reference.json  ──→  intake--design-* (reads JSON, builds design_hint per component)
  │                          ──→  create-tokens (reads tokens block)
  │                          ──→  intake--design-verify (reads source URL)
  ├─ reference[]             ──→  create-scene, setup-compare (reference URLs)
  ├─ reference-full.png      ──→  intake (visual context)
  ├─ reference-header.png    ──→  intake (region screenshot for header component)
  └─ reference-footer.png    ──→  intake (region screenshot for footer component)

intake
  └─ component[] with design_hint (DesignHint)  ──→  create-component (primary design input)
```

## Not Changed

- **Workflow definitions** — stages and step names remain as-is
- **create-component.md** — already reads `design_hint`, just gets richer data and a formal schema
- **create-scene.md** — unaffected, reads `reference[]` not design-reference
- **compare/capture/triage/polish** — unaffected, work with screenshots not design-reference
- **playwright-cli** — remains the extraction tool, same eval-based approach with individual focused calls
