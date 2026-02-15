---
name: designbook-web-reference
description: Analyze a live website to extract structural markup, visual patterns, and component boundaries for Designbook component creation.
---

# Web Reference Analysis

Analyze a live reference website using the browser agent to extract the structural HTML patterns, CSS classes, color system, and component boundaries needed for Designbook component generation.

## When to Use

Use this skill **before** creating UI, Entity, or Screen components whenever the design is based on an existing live website. The output feeds directly into the OpenSpec proposal and component generation skills.

## Prerequisites

- A reference URL (e.g. `https://example.com/blog`)
- Browser agent available
- Target pages identified (listing page, detail page, etc.)

## Input Parameters

```json
{
  "reference_url": "https://example.com/blog",
  "pages": [
    { "name": "listing", "url": "https://example.com/blog", "description": "Blog listing with article teasers" },
    { "name": "detail", "url": "https://example.com/blog/article-slug", "description": "Single article detail page" }
  ],
  "focus_areas": ["header", "hero", "cards", "footer", "body-content"]
}
```

## Output Structure

The skill produces a single Markdown artifact:

```
$ARTIFACT_DIR/markup-analysis.md
```

This file documents:
1. Screenshots of each page area
2. Extracted HTML snippets per component area
3. CSS class inventory (especially color/spacing tokens)
4. Component mapping table (proposed component → actual HTML element)

## Execution Steps

### Step 1: Capture Full Page Screenshots

For each target page, use the browser agent to:

1. Navigate to the URL
2. Maximize the window
3. Take a screenshot at the **top** of the page (header + hero)
4. Scroll to **mid-page** and take a screenshot (content area)
5. Scroll to **bottom** and take a screenshot (footer)

Save screenshots with descriptive names: `[page]_[area]_[timestamp].png`

→ Follow details in [`resources/screenshot-capture.md`](resources/screenshot-capture.md)

### Step 2: Extract Component HTML

For each focus area, use JavaScript execution via the browser agent to extract the actual DOM markup. Run targeted queries, **not** full page dumps.

→ Follow details in [`resources/html-extraction.md`](resources/html-extraction.md)

### Step 3: Analyze Layout System

Determine how the page arranges content:

- **Grid system**: CSS Grid? Flexbox? Table? What classes?
- **Container widths**: `max-w-*` or custom?
- **Spacing**: gaps, padding, margin patterns
- **Responsive breakpoints**: mobile-first? What breakpoint classes?

Extract the grid container around repeating elements (cards, columns):

```javascript
(() => {
  const repeatingElement = document.querySelector('[target-selector]');
  if (!repeatingElement) return 'not found';
  const parent = repeatingElement.parentElement;
  return {
    tag: parent.tagName,
    classes: parent.className,
    display: getComputedStyle(parent).display,
    gridTemplateColumns: getComputedStyle(parent).gridTemplateColumns
  };
})()
```

### Step 4: Extract Color System

Identify custom color classes and their approximate values:

```javascript
(() => {
  const styles = getComputedStyle(document.documentElement);
  const allElements = document.querySelectorAll('*');
  const colorClasses = new Set();
  allElements.forEach(el => {
    el.classList.forEach(cls => {
      if (cls.startsWith('bg-') || cls.startsWith('text-') || cls.startsWith('outline-') || cls.startsWith('border-')) {
        colorClasses.add(cls);
      }
    });
  });
  return Array.from(colorClasses).sort();
})()
```

Document each color class with:
- Class name
- Where it's used (header, footer, cards, etc.)
- Approximate hex value (use browser DevTools color picker or computed styles)

### Step 5: Build Component Mapping Table

Create a mapping between proposed Designbook components and the actual markup:

| Proposed Component | HTML Element | Key Classes | Notes |
|---|---|---|---|
| `card` | `<a>` full link wrapper | `outline outline-2`, `flex flex-col` | Entire card is clickable |
| `hero` | `<div>` with bg color | `grid lg:grid-cols-2` | 2-column on desktop |
| ... | ... | ... | ... |

### Step 6: Write Markup Analysis Artifact

Compile all findings into `markup-analysis.md` with:

1. **Page screenshots** (embedded images)
2. **HTML snippets** per component area (code blocks)
3. **Color class table**
4. **Component mapping table**
5. **Layout system summary**

### Step 7: Propose Token Extensions

After completing the markup analysis, **ask the user** if they want to extend their design tokens with layout values discovered from the reference site.

→ Follow details in [`resources/token-extension.md`](resources/token-extension.md)

**Extracted values to propose:**

| Token Group | What's Extracted | Example |
|-------------|-----------------|---------|
| `container` | `max-w-*` classes with computed px values | `default: 1280px`, `medium: 768px` |
| `grid` | Grid column patterns used | `cols-2`, `cols-3`, `cols-33/66` |
| `gap` | Gap values between grid items | `default: 30px`, `lg: 40px` |
| `section-padding` | Vertical padding on section containers | `default: 100px`, `lg: 200px` |

**Agent behavior:**

1. Present the discovered layout values in a clear table
2. Ask: *"Soll ich diese Layout-Werte als Design Tokens in `design-tokens.json` aufnehmen?"*
3. If **yes** → merge new tokens into `$DESIGNBOOK_DIST/design-tokens.json` under a `layout` group using W3C format
4. If **no** → skip, values remain documented in `markup-analysis.md` only

## Error Handling

| Issue | Recovery |
|-------|----------|
| Page requires auth/cookie consent | Dismiss banners via JS, or note the limitation |
| Dynamic/SPA content not in initial DOM | Wait for load, or trigger scroll events |
| JS extraction returns empty | Try alternative selectors, broaden the search |
| Rate limiting / blocking | Add delays between requests |

## Design Principles

1. **Extract, don't screenshot-only** — Screenshots are visual reference; the HTML snippets are the real deliverable
2. **Component boundaries, not pixel perfection** — Focus on structural patterns (what wraps what), not exact spacing values
3. **Document the CSS framework** — Identify if Tailwind, Bootstrap, custom classes, etc.
4. **Map to Designbook components** — The analysis must end with a clear mapping to proposed components
5. **Reusable patterns** — Identify which HTML patterns repeat across pages (e.g. cards used in both listing and related-articles sections)
