---
name: designbook:design:playwright-capture
trigger:
  steps: [capture, recapture, compare, polish, extract-reference]
---

# Playwright Capture

Hard constraints for capturing screenshots via Playwright. All browser interaction uses `playwright-cli` — see [cli-playwright.md](../../resources/cli-playwright.md) for the full command reference.

## Staged File Flow

Screenshots MUST go through the workflow staging pipeline. Before capturing:

1. **Get the staged path** from the workflow:
   ```bash
   STAGED=$(_debo workflow get-file $WORKFLOW_NAME $TASK_ID --key screenshot | jq -r '.staged_path')
   mkdir -p "$(dirname "$STAGED")"
   ```

2. **Capture to the staged path** (see Capture Modes below).

3. **Register the result** so the file gets tracked and validated:
   ```bash
   _debo workflow result --task $TASK_ID --key screenshot --external
   ```

## Capture Modes

### Full capture (empty selector)

```bash
npx playwright-cli open
npx playwright-cli goto "${url}"
npx playwright-cli resize ${viewportWidth} 1600
npx playwright-cli run-code "async (page) => { await page.waitForTimeout(3000) }"
npx playwright-cli screenshot --full-page --filename "${STAGED}"
npx playwright-cli close
```

> ⛔ **A Storybook STORY's full capture is its rendered content, not the viewport.**
> When capturing a **story** with an empty `selector`, element-capture `#storybook-root`
> (the container Storybook renders the story into) instead of `--full-page`. A
> `--full-page` story shot is the full 1600px viewport — for an isolated component
> (e.g. an entity story ~440px tall) that is mostly empty space, which then drifts
> dimensionally against a region-cropped reference. `#storybook-root` is the actual
> rendered story (the component as-rendered). Reference URLs (not stories) still use
> `--full-page` for an empty `reference_selector`.

### Element capture (region with CSS selector)

Do NOT crop the element's bounding box. Instead **isolate** the first matched
element and capture the whole viewport full-page & transparent — see the
**Isolate-and-capture** pattern in [cli-playwright.md](../../resources/cli-playwright.md).
There is NO `snapshot`/`screenshot <ref>` path any more.

Protocol after `resize` + settle (and after any `check.steps`):

```bash
SEL='<css-selector>'
# 1) Detect matches (eval prints the count; branch in the shell):
COUNT=$(npx playwright-cli -s=<ws> eval "() => document.querySelectorAll('${SEL}').length")
if [ "$COUNT" = "0" ]; then
  # selector matched nothing → full-page fallback + warn, never fail
  npx playwright-cli -s=<ws> run-code "async (page) => { await page.screenshot({ path: '<STAGED>', fullPage: true }) }"
else
  # 2) isolate (hoist first match to body root):
  npx playwright-cli -s=<ws> run-code "async (page) => {
    await page.evaluate(() => {
      const el = document.querySelector('${SEL}');
      document.body.replaceChildren(el);
      el.style.margin = '0';
      el.style.inset = 'auto';
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
      document.body.style.margin = '0';
    });
  }"
  npx playwright-cli -s=<ws> run-code "async (page) => { await page.waitForTimeout(1000) }"
  # 3) full-page transparent capture:
  npx playwright-cli -s=<ws> run-code "async (page) => { await page.screenshot({ path: '<STAGED>', fullPage: true, omitBackground: true }) }"
fi
```

This mode applies to **both** captures, but each side uses its OWN selector — the
story DOM (design-system components) differs from the reference DOM:
- the **Storybook story** capture isolates `check.selector`
- the **reference** capture isolates `check.reference_selector`

Why isolate instead of crop: cropping the bbox drags in overlapping neighbors and
background pixels (false diffs), and crops the element inside its original layout
container so its responsive width is wrong. Isolating hoists the first match to the
`body` root — the element self-sizes against the breakpoint viewport, media queries
respond correctly, and transparent background drops out of the diff on both sides.
A component is standalone by design; if a reference element breaks once detached
from its ancestors, that is a real finding, not noise.

When the match count is `0`, fall back to full-page (skip-with-warning), never fail.
This lets a shell header verify use `.page__header` for the story and `app-site-header`
for the reference, or an entity use an empty story selector (full component) with
`app-signage` for the reference.

**Known limitations (accepted):** `document.querySelector` does not pierce Shadow
DOM or iframes — selectors into a web component's shadow root or an embedded iframe
match nothing and fall back to full-page (use a light-DOM/host selector instead).
`@container` queries whose container ancestor is removed by the hoist may stop
applying. Out-of-flow descendants (`position: absolute/fixed`) may not extend the
scroll height and can be clipped despite full-page.

## Constraints

- **Pin the session to the workspace** — pass `-s=<workspace>` on every `playwright-cli` call (`open`, `goto`, `resize`, `snapshot`, `screenshot`, `eval`, `close`). The unnamed default session is process-global and shared across workspaces; a concurrent run in another workspace can hijack it mid-capture and silently photograph the wrong Storybook. Use a session name unique to this workspace.
- **Dismiss consent/cookie overlays before reference captures** — a consent banner overlaying the reference page corrupts the reference screenshot (and every diff against it). Close it (click reject/accept) before the first reference `screenshot`, and pass the same instruction to any compare/verify subagent that recaptures.
- Viewport height MUST be 1600px for consistency across captures
- `run-code "(page) => { await page.waitForTimeout(3000) }"` MUST be used to allow rendering to settle
- **Run `check.steps` before the screenshot** when present (a non-rest state). After resize + settle, execute each step in order via `playwright-cli` (`click`/`hover`/`focus` against `step.selector`, or a bare wait), settling `step.timeout` ms after each, THEN capture. `rest` has no steps — capture the as-rendered view. State steps mutate page state, so load the session fresh per state-check (or navigate back) rather than carrying an opened state into the next check.
- If a selector matches no elements, skip with a warning — do NOT fail the task
- Output directories MUST be created before capture (`mkdir -p`)
- Reuse an open session across multiple captures for the same URL — only `open`/`close` once

## Storybook Restart

After modifying component templates, scene definitions, or CSS during a polish step, Storybook MUST be restarted before recapture:

```bash
_debo storybook start --force
```
