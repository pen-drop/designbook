---
when:
  steps: [screenshot, visual-compare]
---

# DevTools Context Collection

Collects extra rendering context via Chrome DevTools MCP to enrich visual comparison with actual computed values.

## Instructions

After the Storybook page has been screenshotted, use the DevTools MCP to collect additional context:

### 1. Navigate to Page

```
mcp__devtools__navigate_page({ url: "${storybookIframeUrl}" })
```

### 2. Extract Computed Styles

Call `evaluate_script` with a script that extracts:

- **Layout properties**: `display`, `grid-template-columns`, `flex-direction`, `gap`, `max-width` from key containers
- **Colors**: all unique `color`, `background-color`, `border-color` values from visible elements
- **Fonts**: all unique `font-family`, `font-size`, `font-weight`, `line-height` values
- **Spacing**: `padding`, `margin`, `gap` values from key elements

```
mcp__devtools__evaluate_script({
  script: `
    const elements = document.querySelectorAll('*');
    const styles = { colors: new Set(), fonts: new Set(), layout: [], spacing: [] };
    elements.forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.display !== 'none' && el.offsetHeight > 0) {
        styles.colors.add(cs.color);
        styles.colors.add(cs.backgroundColor);
        styles.fonts.add(cs.fontFamily + ' ' + cs.fontSize);
        // ... collect layout and spacing
      }
    });
    return JSON.stringify({
      colors: [...styles.colors],
      fonts: [...styles.fonts]
    });
  `
})
```

### 3. Take DOM Snapshot

```
mcp__devtools__take_snapshot()
```

Captures the full DOM tree structure for structural comparison.

### 4. Run Accessibility Audit

```
mcp__devtools__lighthouse_audit({ categories: ["accessibility"] })
```

Captures accessibility violations that should be flagged in the visual-compare report.

### 5. Collect Console Errors

```
mcp__devtools__list_console_messages()
```

Captures any JavaScript errors or warnings that occurred during page load.

## Output

Make all collected context available to the `visual-compare` task as additional comparison data. The visual-compare task uses this to verify:

- Computed colors match design token values
- Computed fonts match design token values
- No accessibility violations
- No console errors
