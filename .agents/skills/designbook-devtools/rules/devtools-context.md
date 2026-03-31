---
when:
  steps: [screenshot, visual-compare]
---

# DevTools Context Collection

Collects extra rendering context via Chrome DevTools MCP to enrich visual comparison with actual computed values.

## Prerequisites

- Chrome DevTools MCP server must be configured in `.mcp.json` as `devtools`
- Storybook must be running and accessible

## Instructions

After the Storybook page has been screenshotted, use the DevTools MCP to collect additional context.

### 1. Navigate to Page

```
mcp__devtools__navigate_page({ url: "${storybookIframeUrl}" })
```

### 2. Take Screenshot via DevTools

Use DevTools screenshot for pixel-accurate rendering (captures fonts, shadows, etc. that Playwright may miss):

```
mcp__devtools__take_screenshot()
```

Save the result alongside the Playwright screenshot for comparison.

### 3. Extract Computed Styles

Call `evaluate_script` to extract actual rendered CSS values and verify against design tokens:

```
mcp__devtools__evaluate_script({
  script: `
    (() => {
      const results = { colors: {}, fonts: {}, spacing: {}, layout: {} };
      const seen = new Set();

      // Collect from key semantic elements
      const selectors = [
        'header', 'footer', 'main', 'nav', 'h1', 'h2', 'h3', 'h4',
        'p', 'a', 'button', '[class*="container"]', '[class*="grid"]',
        '[class*="section"]', '[class*="hero"]', '[class*="card"]'
      ];

      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          const cs = getComputedStyle(el);
          const tag = el.tagName.toLowerCase();
          const cls = el.className?.toString().slice(0, 50) || '';
          const key = tag + (cls ? '.' + cls.split(' ')[0] : '');

          if (seen.has(key)) return;
          seen.add(key);

          results.colors[key] = {
            color: cs.color,
            backgroundColor: cs.backgroundColor,
            borderColor: cs.borderColor
          };
          results.fonts[key] = {
            fontFamily: cs.fontFamily,
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            lineHeight: cs.lineHeight,
            letterSpacing: cs.letterSpacing
          };
          results.spacing[key] = {
            padding: cs.padding,
            margin: cs.margin,
            gap: cs.gap
          };
          results.layout[key] = {
            display: cs.display,
            gridTemplateColumns: cs.gridTemplateColumns,
            flexDirection: cs.flexDirection,
            maxWidth: cs.maxWidth,
            width: el.offsetWidth + 'px',
            height: el.offsetHeight + 'px'
          };
        });
      });

      return JSON.stringify(results, null, 2);
    })()
  `
})
```

### 4. Take DOM Snapshot

```
mcp__devtools__take_snapshot()
```

Captures the full DOM tree structure for structural comparison.

### 5. Collect Console Errors

```
mcp__devtools__evaluate_script({
  script: `
    (() => {
      // Check for any error indicators in the DOM
      const errors = [];
      const errorElements = document.querySelectorAll('.sb-errordisplay, [class*="error"]');
      errorElements.forEach(el => {
        errors.push({ text: el.textContent?.slice(0, 200), tag: el.tagName });
      });
      return JSON.stringify({ errors, count: errors.length });
    })()
  `
})
```

### 6. Accessibility Quick Check

```
mcp__devtools__evaluate_script({
  script: `
    (() => {
      const issues = [];
      // Images without alt
      document.querySelectorAll('img:not([alt])').forEach(el => {
        issues.push({ type: 'missing-alt', src: el.src?.slice(0, 100) });
      });
      // Buttons/links without accessible text
      document.querySelectorAll('button, a').forEach(el => {
        if (!el.textContent?.trim() && !el.getAttribute('aria-label')) {
          issues.push({ type: 'missing-label', tag: el.tagName, class: el.className?.slice(0, 50) });
        }
      });
      // Missing landmarks
      const landmarks = ['header', 'main', 'footer', 'nav'];
      landmarks.forEach(tag => {
        if (!document.querySelector(tag)) {
          issues.push({ type: 'missing-landmark', tag });
        }
      });
      // Color contrast (basic check for very light text)
      document.querySelectorAll('p, span, a, h1, h2, h3, h4, li').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.color === 'rgba(0, 0, 0, 0)' || cs.opacity === '0') {
          issues.push({ type: 'invisible-text', tag: el.tagName, class: el.className?.slice(0, 50) });
        }
      });
      return JSON.stringify({ issues, count: issues.length });
    })()
  `
})
```

## How to Use in Visual Compare

Compare collected computed values against design tokens:

| Token | Expected | Computed | Match |
|-------|----------|----------|-------|
| `color.primary` | `#004fa8` | from `results.colors` | ✓/✗ |
| `typography.heading` | `Inter` | from `results.fonts` | ✓/✗ |
| `layout-width.xl` | `1280px` | from `results.layout` | ✓/✗ |

Report any:
- Color mismatches vs. design tokens
- Font mismatches vs. design tokens
- Accessibility violations
- Console errors
- Missing DOM elements vs. reference
