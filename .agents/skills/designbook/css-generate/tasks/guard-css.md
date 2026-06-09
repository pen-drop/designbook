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
    unresolved-placeholders:
      type: array
      description: >
        Generated token declarations whose value still contains an alias
        placeholder (a `{…}` segment) that the JSONata transform failed to
        resolve. Each entry is the offending `--var: value;` line.
      items: { type: string }
---

# Guard CSS

Prove every generated token variable and font actually reaches the rendered
frontend. Framework-independent: checks `:root` custom properties and
`document.fonts`, not utility classes.

## Steps

1. **Expected vars** — collect every `--<name>` declared across the generated
   token files under `$DESIGNBOOK_DIRS_CSS_TOKENS/*.css` (grep `^\s*--[\w-]+:`).
   These are what the design system defines and MUST resolve.
2. **Unresolved placeholders** — scan the same generated token files for any
   declaration whose value still contains an alias placeholder (a `{…}`
   segment, e.g. `--font-heading: "{primitive.typography.reef}";`). A
   placeholder means the JSONata transform emitted the alias raw instead of
   resolving it — the declaration is syntactically valid but semantically dead
   (an invalid `font-family` silently falls back to serif). Collect each
   offending line into `unresolved-placeholders`.
3. **Expected fonts** — collect each `font-family` name from the generated
   `@font-face` blocks (the prepared font stylesheet) and any `font_family`
   typography token.
4. **Probe** — write `$DESIGNBOOK_CSS_DIR/_token-probe.html` (no markup) linking
   the compiled css relatively:
   `<!doctype html><html><head><link rel="stylesheet" href="./app.css"></head><body></body></html>`
5. **Inspect** — run the addon to capture the style env of the probe and diff
   against expected (uses `captureStyleEnv` + `collectMissing`):
   `npx storybook-addon-designbook guard-css --probe "$DESIGNBOOK_CSS_DIR/_token-probe.html" --vars <comma-list> --fonts <comma-list>`
   (CLI prints JSON `{ ok, vars, fonts }`.)
6. **Verdict** — submit `{"guard-passed": true}` only when `ok` AND
   `unresolved-placeholders` is empty. Otherwise FAIL the task; do not mark
   done. Report all three: missing `--vars` (token never reached `:root`, e.g.
   tree-shaken / not generated), missing fonts (no `@font-face` coverage), and
   unresolved placeholders (alias never resolved by the transform).

If chromium/playwright is unavailable, skip with a warning and pass (best-effort
where no browser exists).
