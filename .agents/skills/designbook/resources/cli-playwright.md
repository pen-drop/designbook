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

```bash
npx playwright-cli goto "https://example.com"
npx playwright-cli snapshot                                # find the ref for header
npx playwright-cli screenshot <header-ref> --filename "header.png"
```

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
