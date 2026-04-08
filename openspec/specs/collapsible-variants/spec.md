# collapsible-variants Specification

## Purpose
Visual variants, status coloring, and progress bar for `DeboCollapsible` (`<details>`/`<summary>` with React state).

## Requirements

### Requirement: Variants

| Variant | Default? | Background | Border | Border-radius | Summary font | Summary padding | Content padding |
|---------|----------|------------|--------|---------------|-------------|----------------|----------------|
| `card` | Yes | white, `rgba(248,250,252,0.5)` summary bg | `1px solid rgba(203,213,225,0.75)` | `16px` | `20px/600/30px`, `-0.44px` tracking | `20px` | `20px`, `1px solid #F1F5F9` top border |
| `action-summary` | No | -- | `1px solid rgba(203,213,225,0.5)` | `8px` | `15px/700/22px` | `10px 12px` | `10px 12px`, grid `gap: 6px` |
| `action-item` | No | transparent | -- | `0` | `14px/700/20px` | `6px 6px 6px 10px` | `6px 6px 6px 10px`, grid `gap: 4px` |
| `action-inline` | No | transparent | `2px solid` bottom (status-colored) | `0` | `14px/600/20px` | `4px 0` | `4px 0 4px 18px`, grid `gap: 2px` |

All variants: `overflow: clip`. Card has `box-shadow: 0px 2px 12px -6px rgba(0,0,0,0.05)`.

### Requirement: Status colors
`status` prop controls color for action variants:
- `done`: `rgb(102, 191, 60)` (green)
- `running`: `#FEF3C7` (yellow)
- `pending`: `#F1F5F9` (gray, default)

Status prop has no visible effect on `card` variant.

### Requirement: Progress bar
`progress` prop (`{ done, total }`) renders 3px bottom bar on `action-summary` only. Uses `linear-gradient` from `statusColor` to `#F1F5F9` at computed percentage. When present, summary uses `display: block`, `padding: 0` with inner div for normal padding. Ignored on other variants.

### Requirement: Count badge
Optional `count` prop renders pill badge: `background: rgba(226,232,240,0.8)`, `color: #334155`, `12px/600`, `border-radius: 9999px`, `padding: 2px 8px`, `margin-left: 12px`. Hidden when null/absent.

### Requirement: Chevron toggle
16x16 SVG chevron, stroke `#94a3b8`, stroke-width `2.5`, right-aligned. Rotates 180deg when open, `0.2s ease` transition.
