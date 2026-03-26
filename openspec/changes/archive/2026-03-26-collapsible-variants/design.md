## Context

`DeboCollapsible` is a `<details>/<summary>` based component with all styles hardcoded inline. It's used in section pages, data model detail, design tokens, product overview, and sample data views — always as the `card` variant. Manager components must use inline styles, not Tailwind/DaisyUI classes.

Current component signature:
```
DeboCollapsible({ title, count, defaultOpen, children })
```

## Goals / Non-Goals

**Goals:**
- Three variants: `card`, `action-summary`, `action-item`
- Status-colored left border for action variants
- Progress bar as bottom border for `action-summary`
- Zero breaking changes — existing usages keep working

**Non-Goals:**
- Changing existing usages to use the new variants
- Animation/transitions on the progress bar
- Making this a Storybook public component (stays manager-only)

## Decisions

### 1. Variant style map

Style differences driven by a `variant` prop with object lookup:

| Property | `card` | `action-summary` | `action-item` |
|----------|--------|-------------------|----------------|
| Background | `white` | `transparent` | `transparent` |
| Border | `1px solid rgba(203,213,225,0.75)` | none (left-border only) | none (left-border only) |
| Border-radius | `16px` | `0` | `0` |
| Box-shadow | `0px 2px 12px -6px rgba(0,0,0,0.05)` | none | none |
| Left border | none | `3px solid {statusColor}` | `2px solid {statusColor}` |
| Summary padding | `20px` | `12px` | `4px 4px 4px 8px` |
| Summary font-size | `18px` | `14px` | `12px` |
| Content padding | `20px` | `12px` | `4px 4px 4px 8px` |
| Content border-top | `1px solid #F1F5F9` | none | none |

### 2. Status color mapping

`status` prop controls left-border color on `action-summary` and `action-item`. Ignored on `card`.

| Status | Color | Hex |
|--------|-------|-----|
| `done` | green | `#D0FAE5` |
| `running` | yellow | `#FEF3C7` |
| `pending` (default) | gray | `#F1F5F9` |

### 3. Progress bar via CSS gradient

The `progress` prop (`{ done: number, total: number }`) renders a bottom progress bar on `action-summary` only. Implementation via `border-bottom` with `linear-gradient`:

```css
border-bottom: 3px solid transparent;
border-image: linear-gradient(
  to right,
  #D0FAE5 ${percentage}%,
  #F1F5F9 ${percentage}%
) 1;
```

When `progress.done === progress.total`, the entire bar is green. When `progress` is not provided, no bottom border renders.

### 4. Updated component signature

```
DeboCollapsible({
  title,
  count,
  defaultOpen = false,
  variant = 'card',      // new
  status = 'pending',    // new — left-border color
  progress,              // new — { done, total } for action-summary
  children
})
```

Default `variant="card"` ensures backwards compatibility.

## Risks / Trade-offs

- **Inline style complexity:** Three variants with conditional status/progress means more style logic. → Acceptable because it's contained in one component with a clean object lookup pattern.
- **border-image limitations:** `border-image` doesn't respect `border-radius`. → Not an issue since action variants use `border-radius: 0`.
