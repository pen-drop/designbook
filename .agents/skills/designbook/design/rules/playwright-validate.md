---
name: designbook:design:playwright-validate
trigger:
  steps: [validate]
---

# Playwright Validate (Execution)

Hard constraints for verifying that a Storybook story renders. Applies to every `validate` step.

## Preflight

`story_url` is pre-resolved by the `story_url` resolver at `workflow create` time. The resolver already ensured:

- Storybook is running.
- The story ID is present in Storybook's `/index.json`.

If the resolver returned an error, fix the input (Storybook not running, no matching story ID, or compile error) and restart the stage — do NOT fabricate a URL and do NOT re-check `/index.json` here.

### New components in the same workflow run

Storybook's Twig namespace map (`toTwingNamespaces()`) is built **once at startup**. Components created inside `components/` after Storybook was started are not in that map — stories referencing them render with `Cannot find template: …/<name>/<name>.twig` even though the file exists on disk.

Before the first `validate` step of any workflow that created new components:

- Run `_debo storybook start --force` once to rebuild the namespace map with the new component directories present.
- This is a **preflight** action, not a failure recovery — do not wait for the validate step to fail first.

Skip the preflight only when you can confirm that every component referenced in the scene already existed before Storybook started (e.g. pure scene edits against pre-existing components).

## Render check

Use the Playwright CLI session skeleton documented in [`cli-playwright.md`](../../resources/cli-playwright.md#validate-story-render) (open → goto → resize → wait → eval → close), then read:

- `#storybook-root` inner text or rendered children.
- Any error element: `#error-message`, `#preview-loader-error`, `.sb-errordisplay`.

## Pass criteria

The stage only completes when ALL are true:

- `#storybook-root` contains non-empty text or rendered children.
- No error element is present.
- The Storybook log for the current session has no unresolved compilation errors referencing the scene or its components.

## Failure protocol

1. First failure → `_debo storybook start --force` (single restart attempt), then **restart the stage**. Restarting re-runs the `story_url` resolver, which automatically re-verifies that the story is in `/index.json`.
2. Second failure → stop, read `designbook/storybook.log`, report the cause (missing `.component.yml`, invalid Twig, scene file path, etc.), and fix before resubmitting.
3. Never mark the stage done with a visible error banner or empty root.
