---
name: designbook:design:playwright-validate
trigger:
  steps: [validate]
---

# Playwright Validate (Execution)

Hard constraints for verifying that a Storybook story renders. Applies to every `validate` step.

## Prerequisites

Use the concrete `story_url`, viewport, selectors and observations fixed by intake. For components written in this run, intake declares a Storybook build/restart and index refresh before dependent verification. Their results confirm known IDs; they cannot select new stories or expand scope. A missing prerequisite blocks the saved run.

## Render check

Use the Playwright CLI session skeleton documented in [`cli-playwright.md`](../../resources/cli-playwright.md#validate-story-render) (open → goto → resize → wait → eval → close), then read:

- `#storybook-root` inner text or rendered children.
- Any error element: `#error-message`, `#preview-loader-error`, `.sb-errordisplay`.
- Font load state: for each `font-family` the rendered root resolves to (read the computed `font-family` of `#storybook-root` and its text descendants), confirm the browser actually loaded it via `document.fonts.check('1em "<family>"')`. A generic/system family (`serif`, `sans-serif`, `system-ui`, …) where a named brand family was expected means the real face never loaded.

## Pass criteria

The stage only completes when ALL are true:

- `#storybook-root` contains non-empty text or rendered children.
- No error element is present.
- The Storybook log for the current session has no unresolved compilation errors referencing the scene or its components.
- Every non-generic `font-family` the render resolves to passes `document.fonts.check` (the named face actually loaded). A silent fallback to a system font is a failure, not a pass — it is invisible in the screenshot diff at this stage but breaks typography fidelity.
- Every component the scene renders that has an `interactive[]` entry with a `behavior` is functional: run the `steps` of its first non-rest state against the rendered iframe and confirm the trigger's `aria` attribute flips, or the `target` changes visibility. A trigger that does nothing when exercised is a major issue — static markup with no behavior passes the render checks above but is not done.

## Failure protocol

Record the failed check and concrete cause in the execution
[problems sidecar](../../resources/workflow-execution.md) beside the plan, leave
the task pending, and continue with the next unfinished task. Retry only within
the saved task's declared checks and prerequisites before logging. Additional
artifact targets or requirements need a new intake and definition. Completion
of a single validate task still requires the declared semantic and interaction
observations as well as a nonempty, error-free render — a logged failure is not
a pass.
