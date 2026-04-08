# browser-inspect Specification

## Purpose
Design verification: visual diff subworkflow, capture/compare pipeline, browser inspection, screenshot storage, and reference configuration.

---

## Requirement: Design workflows invoke design-verify as a subworkflow

- `design-shell` and `design-screen` declare a `verify` stage with `each: scene` and `workflow: design-verify`
- `design-component` uses inline `test` stage with `each: component` and steps `[storybook-preview, screenshot, resolve-reference, visual-compare, polish]` (not a subworkflow)

---

## Requirement: design-verify workflow stages

Four stages: `intake`, `test`, `polish`, `outtake`. Test and polish iterate over checks (breakpoint/region pairs).

```yaml
stages:
  intake:
    steps: [design-verify:intake]
  test:
    each: checks
    steps: [capture, compare]
  polish:
    each: checks
    steps: [polish, recapture, verify]
  outtake:
    steps: [design-verify:outtake]
```

- As subworkflow: invoked per scene from parent workflow
- Standalone: intake asks user which scene/reference to use

---

## Requirement: Six pipeline task files

Located in `.agents/skills/designbook/design/tasks/`:

| Task | Step | Pri | Description |
|------|------|-----|-------------|
| `capture-reference` | capture | 10 | Captures reference screenshots via Playwright at each breakpoint/region |
| `capture-storybook` | capture, recapture | 20 | Captures Storybook screenshots at each breakpoint/region |
| `compare-screenshots` | compare | 20 | AI visual comparison per breakpoint/region |
| `compare-markup` | compare | 10 | Inspects reference+Storybook URLs for CSS, fonts, computed styles (only when `source.hasMarkup: true`) |
| `verify` | verify | 60 | Re-compares after polish |
| `polish` | polish | 50 | Reads compare reports, fixes code |

Execution order: `capture` → `compare` → `polish` → `recapture` → `verify`

---

## Requirement: Intake resolves checks via DeboStory

- Subworkflow mode (`params.scene` set): skip dialog, proceed to Storybook readiness check
- Standalone mode (no `params.scene`): ask user which scene/reference
- `_debo story --scene ${scene} --create --json '<meta-seed>' checks` returns checks array passed to `workflow done`

---

## Requirement: capture-reference task

- Reads reference URL from DeboStory entity, captures via Playwright at each breakpoint/region
- Saves to `designbook/stories/{storyId}/screenshots/reference/{breakpoint}--{region}.png`
- Download URLs: download file first, use local `file://` URL
- No reference URL → skip with warning

---

## Requirement: capture-storybook task

- Resolves Storybook iframe URL via `_debo story --scene`, captures at each breakpoint/region
- Saves to `designbook/stories/{storyId}/screenshots/current/{breakpoint}--{region}.png`
- Matches both `capture` and `recapture` steps

---

## Requirement: Screenshot storage paths

All under `designbook/stories/{storyId}/screenshots/` with `{breakpoint}--{region}.png` naming:
- Reference: `reference/{breakpoint}--{region}.png`
- Current: `current/{breakpoint}--{region}.png`

---

## Requirement: Reference configuration in story meta.yml

Stored in `designbook/stories/{storyId}/meta.yml` (story-meta-schema): source URL, origin, breakpoints, regions, thresholds.

- Shell scenes: regions for `header` and `footer` (with CSS selectors) per breakpoint
- Screen scenes: single `full` region with empty selector per breakpoint
- `source.hasMarkup: true` when reference supports inspectable HTML → enables `compare-markup`

---

## Requirement: compare-screenshots task

- Reads both screenshots, performs AI visual comparison per breakpoint/region, persists via DeboStory
- Both available → compare using region threshold for PASS/FAIL
- Missing screenshot → skip with warning

---

## Requirement: compare-markup task

Only runs when `source.hasMarkup: true`. Inspects both URLs via Playwright to extract CSS custom properties, font loading status, computed styles. Skipped when `hasMarkup` is false/absent.

---

## Requirement: Playwright for all browser automation

- Full-page capture: `npx playwright screenshot --full-page` CLI
- Element capture (CSS selector): Playwright Node API with `page.locator(selector).screenshot()`

---

## Requirement: polish task

- Failures found → fix code (components, CSS, scenes), report changes
- All passed → complete with "No visual issues found"
- CSS output changes → report MUST include: "CSS output values adjusted -- reconcile with `design-tokens.yml` via tokens workflow"

---

## Requirement: Outtake summary

- All checks `lastResult: pass` → "All checks passed. Workflow complete."
- Failures remain → list issues, suggest re-running `design-verify`
