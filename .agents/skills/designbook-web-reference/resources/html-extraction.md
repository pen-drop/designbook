# HTML Extraction

Detailed instructions for extracting structural HTML from a live website using browser agent JavaScript execution.

## Strategy

Extract HTML per **component area**, not the entire page. Each extraction targets one component boundary.

## Extraction Queries

### Header

```javascript
document.querySelector('header')?.outerHTML?.substring(0, 2000) || 'no header found'
```

### Article Cards / Teasers

Find repeating card elements. Common selectors to try in order:

```javascript
(() => {
  // Strategy 1: Look for outline-styled links (card pattern)
  const cards = document.querySelectorAll('a[class*="outline"]');
  if (cards.length > 0) return cards[0].outerHTML.substring(0, 4000);

  // Strategy 2: Look for <article> elements
  const articles = document.querySelectorAll('article');
  if (articles.length > 0) return articles[0].outerHTML.substring(0, 4000);

  // Strategy 3: Look for card-like class names
  const cardDivs = document.querySelectorAll('[class*="card"], [class*="teaser"]');
  if (cardDivs.length > 0) return cardDivs[0].outerHTML.substring(0, 4000);

  return 'no cards found';
})()
```

### Grid / Layout Container

Trace the parent hierarchy of a repeating element to find the grid/flex container:

```javascript
(() => {
  const card = document.querySelector('[first-card-selector]');
  if (!card) return 'card not found';

  let current = card;
  const path = [];
  for (let i = 0; i < 8; i++) {
    if (!current) break;
    path.push({
      tag: current.tagName,
      classes: current.className.substring(0, 200),
      display: getComputedStyle(current).display,
      gridTemplateColumns: getComputedStyle(current).gridTemplateColumns
    });
    current = current.parentElement;
  }
  return path;
})()
```

### Hero / Banner Section

Find the H1 and walk up to its container section:

```javascript
(() => {
  const h1 = document.querySelector('h1');
  if (!h1) return 'no h1';
  let container = h1.parentElement;
  for (let i = 0; i < 3; i++) {
    if (container.parentElement) container = container.parentElement;
  }
  return container.outerHTML.substring(0, 4000);
})()
```

### Breadcrumbs

```javascript
(() => {
  // Strategy 1: Semantic nav
  const bc = document.querySelector('nav[aria-label*="breadcrumb" i]')
           || document.querySelector('[class*="breadcrumb"]');
  if (bc) return bc.outerHTML.substring(0, 1000);

  // Strategy 2: Find "Home" link and walk up
  const links = document.querySelectorAll('a');
  for (const link of links) {
    if (['Home', 'Startseite', 'Start'].includes(link.textContent.trim())) {
      return link.parentElement.parentElement.outerHTML.substring(0, 1000);
    }
  }
  return 'no breadcrumbs found';
})()
```

### Footer

```javascript
document.querySelector('footer')?.outerHTML?.substring(0, 4000) || 'no footer found'
```

### Main Content Area

```javascript
(() => {
  const main = document.querySelector('main') || document.querySelector('[role="main"]');
  if (!main) return 'no main found';
  const children = Array.from(main.children).map(c =>
    `<${c.tagName} class="${c.className.substring(0, 100)}">`
  );
  return {
    childrenOverview: children,
    fullHtml: main.outerHTML.substring(0, 5000)
  };
})()
```

## Color Class Inventory

Extract all CSS color-related classes used on the page:

```javascript
(() => {
  const colorClasses = new Set();
  document.querySelectorAll('*').forEach(el => {
    el.classList.forEach(cls => {
      if (/^(bg-|text-|border-|outline-|ring-|shadow-|accent-)/.test(cls)) {
        colorClasses.add(cls);
      }
    });
  });
  return Array.from(colorClasses).sort();
})()
```

## Browser Agent Task Template

Use this combined extraction in a single browser agent call:

```
Navigate to [URL] and extract detailed HTML markup.
Execute the following JavaScript snippets and return ALL raw output — do not summarize.

1. Header: [query]
2. Cards: [query]
3. Grid container: [query]
4. Hero: [query]
5. Breadcrumbs: [query]
6. Footer: [query]
7. Main content: [query]
8. Color classes: [query]

Return the complete JavaScript output for each query.
```

## Rules

1. **Always substring** — Limit `.outerHTML` to prevent massive output (4000 chars max per snippet)
2. **Multiple strategies** — Provide fallback selectors in case the primary one fails
3. **Request raw output** — Tell the browser agent to return full output, not summaries
4. **One page per call** — Extract all areas from a single page in one browser agent call to minimize navigation
5. **Class focus** — For Tailwind/utility-CSS sites, the class list IS the component specification
