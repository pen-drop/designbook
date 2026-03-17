# Token Extension from Web Reference

Instructions for extracting layout-related values from a reference website and proposing them as W3C design tokens.

## What to Extract

### Container Widths

Extract `max-width` values from the main content containers:

```javascript
(() => {
  const containers = document.querySelectorAll('[class*="max-w-"]');
  const widths = {};
  containers.forEach(el => {
    const maxW = getComputedStyle(el).maxWidth;
    el.classList.forEach(cls => {
      if (cls.startsWith('max-w-')) {
        widths[cls.replace('max-w-', '')] = maxW;
      }
    });
  });
  return widths;
})()
```

Expected output example:
```json
{ "default": "1280px", "medium": "768px", "sm": "640px" }
```

### Grid Column Patterns

Extract unique grid-template-columns patterns:

```javascript
(() => {
  const grids = document.querySelectorAll('[class*="grid-cols-"]');
  const patterns = {};
  grids.forEach(el => {
    el.classList.forEach(cls => {
      if (cls.includes('grid-cols-')) {
        const computed = getComputedStyle(el).gridTemplateColumns;
        patterns[cls] = computed;
      }
    });
  });
  return patterns;
})()
```

### Gap Values

```javascript
(() => {
  const grids = document.querySelectorAll('[class*="gap-"]');
  const gaps = {};
  grids.forEach(el => {
    el.classList.forEach(cls => {
      if (cls.startsWith('gap-') || cls.includes(':gap-')) {
        const computed = getComputedStyle(el).gap;
        gaps[cls] = computed;
      }
    });
  });
  return gaps;
})()
```

### Section Padding

```javascript
(() => {
  const sections = document.querySelectorAll('[class*="section-container"], [class*="py-"], [class*="pt-"], [class*="pb-"]');
  const paddings = {};
  sections.forEach((el, i) => {
    const pt = getComputedStyle(el).paddingTop;
    const pb = getComputedStyle(el).paddingBottom;
    if (pt !== '0px' || pb !== '0px') {
      const key = `section-${i}`;
      paddings[key] = { paddingTop: pt, paddingBottom: pb, classes: el.className.substring(0, 100) };
    }
  });
  return paddings;
})()
```

## Presenting to the User

After extraction, present the values in a clear table using `notify_user`:

```markdown
I discovered these layout values from the reference site:

### Container Widths
| Token Name | Value | Source Class |
|------------|-------|-------------|
| `container.default` | 1280px | `max-w-default` |
| `container.medium` | 768px | `max-w-medium` |

### Grid Patterns
| Token Name | Pattern | Source Class |
|------------|---------|-------------|
| `grid.cols-2` | `repeat(2, 1fr)` | `grid-cols-2` |
| `grid.cols-3` | `repeat(3, 1fr)` | `md:grid-cols-3` |
| `grid.cols-33-66` | `33.3% 66.6%` | `lg:grid-cols-33/66` |

### Spacing
| Token Name | Value | Source Class |
|------------|-------|-------------|
| `gap.default` | 30px | `gap-7.5` |
| `gap.lg` | 40px | `lg:gap-10` |
| `section-padding.default` | 100px | `pt-[100px]` |
| `section-padding.lg` | 200px | `lg:pt-[200px]` |

**Soll ich diese Layout-Werte als Design Tokens aufnehmen?**
```

## W3C Token Format

If the user approves, merge tokens into `$DESIGNBOOK_DIST/design-tokens.yml` under a `layout` group:

```json
{
  "layout": {
    "container-default": {
      "$value": "1280px",
      "$type": "dimension",
      "description": "Default content container max-width"
    },
    "container-medium": {
      "$value": "768px",
      "$type": "dimension",
      "description": "Narrow content container (body text)"
    },
    "gap-default": {
      "$value": "30px",
      "$type": "dimension",
      "description": "Default grid gap between items"
    },
    "gap-lg": {
      "$value": "40px",
      "$type": "dimension",
      "description": "Large grid gap (desktop)"
    },
    "section-padding-default": {
      "$value": "100px",
      "$type": "dimension",
      "description": "Default vertical section padding"
    },
    "section-padding-lg": {
      "$value": "200px",
      "$type": "dimension",
      "description": "Large vertical section padding (desktop)"
    }
  }
}
```

## Rules

1. **Always ask** — Never auto-merge tokens without user confirmation
2. **Show source** — Always include the source CSS class so the user can verify
3. **Use W3C format** — `$value`, `$type: "dimension"`, `description`
4. **Merge, don't replace** — Add the `layout` group alongside existing `color` and `typography` groups
5. **Document grid patterns** — Grid column patterns are documented in `markup-analysis.md` but NOT stored as tokens (they're layout utilities, not design tokens)
