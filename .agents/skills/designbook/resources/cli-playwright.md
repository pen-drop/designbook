# CLI: playwright-cli

Browser automation for screenshots, DOM extraction, and element interaction. Invoked via `npx playwright-cli`.

```bash
npx playwright-cli <command> [args] [options]
```

Sessions persist across commands — `open` starts a session, subsequent commands reuse it until `close`.

## Session Lifecycle

```bash
npx playwright-cli open                          # start browser session
npx playwright-cli goto <url>                    # navigate
npx playwright-cli resize <width> <height>       # set viewport
# ... work ...
npx playwright-cli close                         # end session
```

## Screenshot

```bash
npx playwright-cli screenshot                              # viewport screenshot
npx playwright-cli screenshot --full-page                  # full scrollable page
npx playwright-cli screenshot --filename <path>            # save to specific path
npx playwright-cli screenshot --full-page --filename <path>
npx playwright-cli screenshot <ref>                        # element screenshot
npx playwright-cli screenshot <ref> --filename <path>      # element screenshot to path
```

Element refs come from `snapshot` (see below).

## Snapshot (DOM)

```bash
npx playwright-cli snapshot                                # returns page snapshot with element refs
npx playwright-cli snapshot --filename <path>              # save snapshot to file
```

Returns a structured representation of the page with `ref` identifiers for each element. Use refs in `screenshot <ref>` or `eval <func> <ref>`.

## Eval (JavaScript on Page)

```bash
npx playwright-cli eval "() => document.title"
npx playwright-cli eval "() => { return JSON.stringify(getComputedStyle(document.body)) }"
npx playwright-cli eval "(el) => el.textContent" <ref>     # evaluate on specific element
```

Runs JavaScript in the browser context. Use for DOM extraction — fonts, computed styles, colors, landmark structure.

## Run Code (Playwright API)

```bash
npx playwright-cli run-code "async (page) => { await page.waitForTimeout(3000) }"
```

Runs Playwright code with the `page` object. Use for complex interactions that need the Playwright API (waiting, scrolling, etc.).

## Common Patterns

### Validate story render

Session skeleton for checking that a Storybook iframe renders without errors.
Used by [`design/rules/playwright-validate.md`](../design/rules/playwright-validate.md):

```bash
npx playwright-cli open
npx playwright-cli goto "${story_url}"
npx playwright-cli resize 1280 800
npx playwright-cli run-code "async (page) => { await page.waitForTimeout(2000) }"
npx playwright-cli eval "document.querySelector('#storybook-root')?.innerText || ''"
npx playwright-cli eval "document.querySelector('#error-message, #preview-loader-error, .sb-errordisplay')?.innerText || ''"
npx playwright-cli close
```

### Full-page screenshot at specific viewport

```bash
npx playwright-cli open
npx playwright-cli goto "https://example.com"
npx playwright-cli resize 1440 1600
npx playwright-cli screenshot --full-page --filename "reference.png"
npx playwright-cli close
```

### Element screenshot via snapshot ref

> ⛔ **Do NOT use this recipe for design-verify element capture.** The `snapshot` +
> `screenshot <ref>` approach crops the element's bounding box, which drags in
> overlapping neighbours and wrong layout widths. Use the **Isolate-and-capture**
> pattern below instead.

```bash
npx playwright-cli goto "https://example.com"
npx playwright-cli snapshot                                # find the ref for header
npx playwright-cli screenshot <header-ref> --filename "header.png"
```

### Isolate-and-capture (isolate element, full-page transparent)

Instead of cropping the bounding-box rectangle of an element: hoist the first
matched element to the `body` root, remove everything else, set background
transparent, force the isolated capture surface to the breakpoint width, then
capture the full viewport full-page transparent. The screenshot keeps the
breakpoint width even when the rendered content is narrower; overlapping foreign
elements and backgrounds fall away.

> **Important:** The second parameter of `eval` is an **element ref**, not a value —
> therefore a selector CANNOT be passed as an argument. Use `eval` for match
> detection (returns the count, branchable in the shell); use `run-code` +
> `page.evaluate` with the selector **inlined** for the hoist step.

```bash
SEL='<css-selector>'   # in den run-code-String eingebettet (Single-Quotes außen)
npx playwright-cli -s=$WS open
npx playwright-cli -s=$WS goto "${url}"
npx playwright-cli -s=$WS resize ${viewportWidth} 1600
npx playwright-cli -s=$WS run-code "async (page) => {
  try { await page.waitForLoadState('networkidle'); } catch {}
  try { await page.waitForSelector('${SEL}', { state: 'visible', timeout: 8000 }); } catch {}
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}"
# (optional) check.steps hier ausführen — im VOLLEN Layout, vor dem Freistellen

# 1) Treffer-Erkennung (gibt die Zahl auf stdout zurück):
COUNT=$(npx playwright-cli -s=$WS eval "() => document.querySelectorAll('${SEL}').length")
if [ "$COUNT" = "0" ]; then
  # full-page-Fallback + Warnung (NIE fail)
  npx playwright-cli -s=$WS run-code "async (page) => { await page.screenshot({ path: '${STAGED}', fullPage: true }) }"
else
  # 2) Freistellen (Hoist ans body-Root):
  npx playwright-cli -s=$WS run-code "async (page) => {
    await page.evaluate((viewportWidth) => {
      const el = document.querySelector('${SEL}');
      const surface = document.createElement('div');
      surface.setAttribute('data-designbook-capture-surface', '');
      surface.style.boxSizing = 'border-box';
      surface.style.width = viewportWidth + 'px';
      surface.style.minWidth = viewportWidth + 'px';
      surface.style.margin = '0';
      surface.style.padding = '0';
      surface.style.background = 'transparent';
      surface.appendChild(el);
      document.body.replaceChildren(surface);
      el.style.margin = '0';
      el.style.inset = 'auto';
      document.documentElement.style.background = 'transparent';
      document.documentElement.style.width = viewportWidth + 'px';
      document.documentElement.style.minWidth = viewportWidth + 'px';
      document.body.style.background = 'transparent';
      document.body.style.margin = '0';
      document.body.style.width = viewportWidth + 'px';
      document.body.style.minWidth = viewportWidth + 'px';
      document.body.style.overflowX = 'hidden';
    }, ${viewportWidth});
  }"
  npx playwright-cli -s=$WS run-code "async (page) => { await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))) }"
  # 3) Full-page transparent capturen:
  npx playwright-cli -s=$WS run-code "async (page) => { await page.screenshot({ path: '${STAGED}', fullPage: true, omitBackground: true }) }"
fi
npx playwright-cli -s=$WS close
```

- Match count `0` → full-page fallback + warning (never fail). Explicit branch.
- The transparent capture surface is forced to the breakpoint width. The component's
  own element and inner content may still be narrower via max-width/container styles,
  but the PNG width must match the breakpoint on reference and story captures.
- `omitBackground: true` + transparent body background → whitespace is transparent.
- A selector with single quotes (e.g. `[data-x='y']`) breaks the inline quoting —
  in that rare case use double quotes in the selector or escape them.
- `document.fonts.ready` alone is insufficient for client-side rendering; `waitForSelector(<target>)` is the real CSR signal (the target exists and is visible). Both `waitForLoadState` and `waitForSelector` are in `try/catch` so a no-match dovetails with the COUNT gate (→ full-page fallback), never fails.
- Limitations (accepted): `querySelector` does not pierce Shadow DOM / iframes;
  out-of-flow descendants may be clipped despite full-page.

### DOM extraction for design reference

```bash
npx playwright-cli goto "https://example.com"
npx playwright-cli resize 1440 1600
npx playwright-cli eval "() => {
  const fonts = new Set();
  document.querySelectorAll('*').forEach(el => {
    const ff = getComputedStyle(el).fontFamily;
    if (ff) fonts.add(ff.split(',')[0].trim().replace(/['\"/]/g, ''));
  });
  return JSON.stringify([...fonts]);
}"
```

### Extract landmark structure

```bash
npx playwright-cli eval "() => {
  function getProps(el) {
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, height: el.offsetHeight + 'px', padding: cs.padding, borderBottom: cs.borderBottom };
  }
  const header = document.querySelector('header');
  const rows = header ? [...header.children].map(c => ({ tag: c.tagName, ...getProps(c), text: c.textContent?.substring(0, 100).trim() })) : [];
  const footer = document.querySelector('footer');
  const sections = footer ? [...footer.children].map(c => ({ tag: c.tagName, ...getProps(c), text: c.textContent?.substring(0, 100).trim() })) : [];
  return JSON.stringify({ header: rows, footer: sections });
}"
```

### Extract color palette

```bash
npx playwright-cli eval "() => {
  const bgs = new Set();
  const texts = new Set();
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') bgs.add(cs.backgroundColor);
    texts.add(cs.color);
  });
  return JSON.stringify({ backgrounds: [...bgs], text: [...texts] });
}"
```

## Constraints

- Viewport height MUST be 1600px for consistency across captures
- Always `resize` before capture to ensure correct viewport
- Sessions are stateful — `goto` changes the current page for all subsequent commands
- `eval` runs in the browser context (no Node.js APIs)
- `run-code` runs with the Playwright `page` object (has Node.js + Playwright APIs)
