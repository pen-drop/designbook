# Playwright Eval Scripts

Reusable eval scripts for the `extract-reference` task. Each script runs via `npx @playwright/cli eval` and returns JSON.

## eval 1: Fonts

```bash
npx @playwright/cli eval "() => {
  const fonts = new Map();
  document.querySelectorAll('*').forEach(el => {
    const ff = getComputedStyle(el).fontFamily.split(',')[0].trim().replace(/['\x22]/g, '');
    if (!fonts.has(ff)) fonts.set(ff, { weights: new Set(), styles: new Set() });
    const entry = fonts.get(ff);
    entry.weights.add(parseInt(getComputedStyle(el).fontWeight));
    entry.styles.add(getComputedStyle(el).fontStyle);
  });
  return JSON.stringify([...fonts.entries()].map(([f, d]) => ({
    family: f,
    weights: [...d.weights].sort(),
    styles: [...d.styles]
  })));
}"
```

For each non-system font: extract `@font-face` declarations and Google Fonts `<link>` imports to get the `source` URL.

## eval 2: Typography

```bash
npx @playwright/cli eval "() => {
  const elements = ['h1','h2','h3','h4','h5','h6','p','a','button','li','span','label','figcaption'];
  const results = [];
  for (const tag of elements) {
    const el = document.querySelector(tag);
    if (!el) continue;
    const cs = getComputedStyle(el);
    results.push({
      element: tag,
      font_family: cs.fontFamily.split(',')[0].trim().replace(/['\x22]/g, ''),
      font_size: cs.fontSize,
      line_height: cs.lineHeight,
      letter_spacing: cs.letterSpacing,
      font_weight: parseInt(cs.fontWeight),
      color: cs.color
    });
  }
  return JSON.stringify(results);
}"
```

## eval 3: Colors

```bash
npx @playwright/cli eval "() => {
  const colors = new Map();
  function addColor(hex, usage) {
    if (!colors.has(hex)) colors.set(hex, new Set());
    colors.get(hex).add(usage);
  }
  function rgbToHex(rgb) {
    const m = rgb.match(/\d+/g);
    if (!m || m.length < 3) return null;
    return '#' + m.slice(0,3).map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
  }
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    if (bg !== 'rgba(0, 0, 0, 0)') { const h = rgbToHex(bg); if (h) addColor(h, 'background'); }
    const c = cs.color; { const h = rgbToHex(c); if (h) addColor(h, 'text'); }
    const bc = cs.borderColor; if (bc && bc !== cs.color) { const h = rgbToHex(bc); if (h) addColor(h, 'border'); }
    const bs = cs.boxShadow; if (bs && bs !== 'none') {
      const m2 = bs.match(/rgba?\([^)]+\)/); if (m2) { const h = rgbToHex(m2[0]); if (h) addColor(h, 'shadow'); }
    }
  });
  return JSON.stringify([...colors.entries()].map(([hex, usage]) => ({ hex, usage: [...usage] })));
}"
```

## eval 4: CSS Variables

```bash
npx @playwright/cli eval "() => {
  const vars = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText === ':root' || rule.selectorText === ':host') {
          for (const prop of rule.style) {
            if (prop.startsWith('--')) {
              vars.push({ name: prop, value: rule.style.getPropertyValue(prop).trim() });
            }
          }
        }
      }
    } catch(e) { /* cross-origin sheet */ }
  }
  return JSON.stringify(vars);
}"
```

## eval 5: Spacing

```bash
npx @playwright/cli eval "() => {
  const spacings = new Set();
  const body = document.body;
  const bodyCs = getComputedStyle(body);
  const main = document.querySelector('main') || document.querySelector('[role=main]') || body.children[0];
  const mainCs = main ? getComputedStyle(main) : {};
  document.querySelectorAll('section, article, [class*=container], [class*=wrapper], main > *').forEach(el => {
    const cs = getComputedStyle(el);
    ['marginTop','marginBottom','paddingTop','paddingBottom','paddingLeft','paddingRight','gap'].forEach(p => {
      const v = cs[p]; if (v && v !== '0px' && v !== 'normal') spacings.add(v);
    });
  });
  return JSON.stringify({
    container_max_width: mainCs.maxWidth || 'none',
    edge_padding: bodyCs.paddingLeft || '0px',
    section_gap: mainCs.gap || 'auto',
    values: [...spacings].sort((a,b) => parseInt(a) - parseInt(b))
  });
}"
```

## eval 6: Landmarks

```bash
npx @playwright/cli eval "() => {
  function getRow(el) {
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      bg: cs.backgroundColor,
      height: el.offsetHeight + 'px',
      padding: cs.padding,
      content: el.textContent?.substring(0, 200).trim(),
      layout: cs.display + (cs.flexDirection ? ' ' + cs.flexDirection : '') + (cs.gridTemplateColumns ? ' grid' : ''),
      gap: cs.gap || 'none'
    };
  }
  const header = document.querySelector('header');
  const headerRows = header ? [...header.children].map(getRow) : [];
  const footer = document.querySelector('footer');
  const footerRows = footer ? [...footer.children].map(getRow) : [];
  return JSON.stringify({ header: { rows: headerRows }, footer: { rows: footerRows } });
}"
```

## eval 7: Interactive

```bash
npx @playwright/cli eval "() => {
  const items = [];
  document.querySelectorAll('a, button, [role=button], input[type=submit]').forEach(el => {
    const cs = getComputedStyle(el);
    const text = el.textContent?.trim().substring(0, 50);
    if (!text) return;
    items.push({
      element: text,
      selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''),
      bg: cs.backgroundColor,
      color: cs.color,
      border_radius: cs.borderRadius,
      padding: cs.padding,
      font: cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily.split(',')[0].trim().replace(/['\x22]/g, ''),
      box_shadow: cs.boxShadow !== 'none' ? cs.boxShadow : '',
      border: cs.border !== 'none' ? cs.border : ''
    });
  });
  return JSON.stringify(items);
}"
```

## eval 8: Box Model

```bash
npx @playwright/cli eval "() => {
  const radii = new Set();
  const shadows = new Set();
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.borderRadius && cs.borderRadius !== '0px') radii.add(cs.borderRadius);
    if (cs.boxShadow && cs.boxShadow !== 'none') shadows.add(cs.boxShadow);
  });
  return JSON.stringify({ radii: [...radii], shadows: [...shadows] });
}"
```
