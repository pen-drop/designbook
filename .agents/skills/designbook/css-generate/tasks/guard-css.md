---
name: designbook:css-generate:guard-css
title: "Guard CSS — token + font presence"
trigger:
  steps: [guard-css]
result:
  type: object
  required: [guard-passed]
  properties:
    guard-passed: { type: boolean }
    missing-vars: { type: array, items: { type: string } }
    missing-fonts: { type: array, items: { type: string } }
---

# Guard CSS

Prove every generated token variable and font actually reaches the rendered
frontend. Framework-independent: checks `:root` custom properties and
`document.fonts`, not utility classes.

## Steps

1. **Expected vars** — collect every `--<name>` declared across the generated
   token files under `$DESIGNBOOK_DIRS_CSS/tokens/*.css` (grep `^\s*--[\w-]+:`).
   These are what the design system defines and MUST resolve.
2. **Expected fonts** — collect each `font-family` name from the generated
   `@font-face` blocks (the prepared font stylesheet) and any `font_family`
   typography token.
3. **Probe** — write `$DESIGNBOOK_DIRS_CSS/_token-probe.html` (no markup) linking
   the compiled css relatively:
   `<!doctype html><html><head><link rel="stylesheet" href="./app.css"></head><body></body></html>`
4. **Inspect** — run the addon to capture the style env of the probe and diff
   against expected (uses `captureStyleEnv` + `collectMissing`):
   `npx storybook-addon-designbook guard-css --probe "$DESIGNBOOK_DIRS_CSS/_token-probe.html" --vars <comma-list> --fonts <comma-list>`
   (CLI prints JSON `{ ok, vars, fonts }`.)
5. **Verdict** — if `ok`, submit `{"guard-passed": true}`. Otherwise FAIL the
   task: report the missing `--vars` and fonts; do not mark done. A missing var
   means the token never reached `:root` (e.g. tree-shaken / not generated).

If chromium/playwright is unavailable, skip with a warning and pass (best-effort
where no browser exists).
