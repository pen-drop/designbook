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

### Full-page capture (region `full` or empty selector)

```bash
npx playwright-cli open
npx playwright-cli goto "${url}"
npx playwright-cli resize ${viewportWidth} 1600
npx playwright-cli run-code "async (page) => { await page.waitForTimeout(3000) }"
npx playwright-cli screenshot --full-page --filename "${STAGED}"
npx playwright-cli close
```

### Element capture (region with CSS selector)

Use `snapshot` to get element refs, then `screenshot` with the ref:

```bash
npx playwright-cli open
npx playwright-cli goto "${url}"
npx playwright-cli resize ${viewportWidth} 1600
npx playwright-cli run-code "async (page) => { await page.waitForTimeout(3000) }"
npx playwright-cli snapshot
# Find the ref for the target element (e.g. header, footer)
npx playwright-cli screenshot <ref> --filename "${STAGED}"
npx playwright-cli close
```

If the element is best identified by CSS selector, use `eval` to confirm it exists, then `snapshot` to get its ref.

## Constraints

- **Pin the session to the workspace** — pass `-s=<workspace>` on every `playwright-cli` call (`open`, `goto`, `resize`, `snapshot`, `screenshot`, `eval`, `close`). The unnamed default session is process-global and shared across workspaces; a concurrent run in another workspace can hijack it mid-capture and silently photograph the wrong Storybook. Use a session name unique to this workspace.
- **Dismiss consent/cookie overlays before reference captures** — a consent banner overlaying the reference page corrupts the reference screenshot (and every diff against it). Close it (click reject/accept) before the first reference `screenshot`, and pass the same instruction to any compare/verify subagent that recaptures.
- Viewport height MUST be 1600px for consistency across captures
- `run-code "(page) => { await page.waitForTimeout(3000) }"` MUST be used to allow rendering to settle
- If a selector matches no elements, skip with a warning — do NOT fail the task
- Output directories MUST be created before capture (`mkdir -p`)
- Reuse an open session across multiple captures for the same URL — only `open`/`close` once
- **`resize` invalidates element refs.** Any `resize` (or other layout-affecting op) makes the
  refs from a prior `snapshot` stale; a `screenshot <ref>` against a stale ref silently falls back
  to a full-page capture. So within a reused session, after EACH `resize`, settle (`waitForTimeout`)
  and re-run `snapshot` to re-acquire the ref, then `screenshot <ref>` immediately — never reuse a
  ref captured at a different viewport.

## Storybook Restart

After modifying component templates, scene definitions, or CSS during a polish step, Storybook MUST be restarted before recapture:

```bash
_debo storybook start --force
```
