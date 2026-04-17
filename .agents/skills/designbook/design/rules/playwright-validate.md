---
name: designbook:design:validate-story
trigger:
  steps: [validate]
---

# Validate Story (Execution)

Hard constraints for verifying that a Storybook story renders. Applies to every `validate` step.

## Preflight

1. If `_debo storybook status` reports `running: false`, run `_debo storybook start --force` and wait for the status file to show `running: true` before continuing.
2. `story_url` is pre-resolved by the `story_url` resolver. If the resolver returned an error at `workflow create` time, fix the input (Storybook not running, no matching story ID) and restart the stage — do NOT fabricate a URL.

## Index check

Verify the story ID is present in Storybook's index before loading the iframe:

```bash
BASE="${story_url%/iframe.html*}"
STORY_ID=$(echo "$story_url" | sed -E 's/.*id=([^&]+).*/\1/')
curl -sf "${BASE}/index.json" | jq -e --arg id "${STORY_ID}" '.entries[$id]'
```

If the entry is absent, run `_debo storybook start --force` once and re-check. Index misses after one restart indicate a compilation problem — read `designbook/storybook.log` for the root cause.

## Render check

Use Playwright CLI (not the Node API) for the actual render check — consistent with `playwright-capture`:

```bash
npx playwright-cli open
npx playwright-cli goto "${story_url}"
npx playwright-cli resize 1280 800
npx playwright-cli run-code "async (page) => { await page.waitForTimeout(2000) }"
npx playwright-cli eval "document.querySelector('#storybook-root')?.innerText || ''"
npx playwright-cli eval "document.querySelector('#error-message, #preview-loader-error, .sb-errordisplay')?.innerText || ''"
npx playwright-cli close
```

## Pass criteria

The stage only completes when ALL are true:

- `#storybook-root` contains non-empty text or rendered children.
- No error element (`#error-message`, `#preview-loader-error`, `.sb-errordisplay`) is present.
- The Storybook log for the current session has no unresolved compilation errors referencing the scene or its components.

## Failure protocol

1. First failure → `_debo storybook start --force` (single restart attempt), re-run index + render check.
2. Second failure → stop, read `designbook/storybook.log`, report the cause (missing `.component.yml`, invalid Twig, scene file path, etc.), and fix before resubmitting.
3. Never mark the stage done with a visible error banner or empty root.
