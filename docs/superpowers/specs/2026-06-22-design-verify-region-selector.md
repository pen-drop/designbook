# Design-Verify Region Selector Unification — Design

**Branch:** `feat/entity-ref-render-content-check`

**Goal:** Make `design-verify` crop the **reference** screenshot to the verified region
(via a CSS selector), the same way the build workflows (design-entity/shell/screen) target
a region. One unified `selector` per check drives both the story crop and the reference
crop, so verifying an entity against `app-signage` on leando.de — or a shell header/footer
against the reference — compares region-to-region instead of region-to-whole-page.

## Problem

`design-verify` ran on the `paragraph.signage` entity story but compared the
component-only story screenshot (1440×1600) against the **whole** leando.de page
(1440×4872): diff 78.49%, dimension drift 67%, score useless.

Root cause: `capture-reference` crops the reference only by `region` (full / header /
footer). `check.selector` exists but is applied **only to the story capture**, never to
the reference. For an entity (region `full` + a selector like `app-signage`) the reference
stays full-page. design-verify was never unified with the reference/selector mechanism the
build workflows now have.

## Principle

A check defines one **region target** — a CSS selector — applied to both the story
capture and the reference capture via the existing Playwright element-capture mode
(`snapshot` → `screenshot <ref>`). The selector is resolved per region:
- `full` → the workflow's `selector` param (e.g. `app-signage`); empty ⇒ full page.
- `header` → `header, [role=banner]`
- `footer` → `footer, [role=contentinfo]`

The existing rule "if a selector matches no elements, skip with a warning — do NOT fail"
gracefully handles story↔reference DOM differences: `app-signage` matches only the
reference, so the reference is cropped while the story (already just the component) falls
back to its full viewport. For shell, `header`/`footer` match both DOMs → both cropped.

## Changes (skill-only — capture is agent-driven via `playwright-cli`, no addon code)

### 1. `design/workflows/design-verify.md`
Add `selector: { type: string, default: "" }` param (mirrors design-entity). Thread it
into `setup-compare` (and it is available to the capture stages via scope).

### 2. `design/tasks/setup-compare.md`
Populate each emitted check's `selector` from a region→selector map:
- `full` → the workflow `selector` param (may be empty → no crop)
- `header` → `header, [role=banner]`
- `footer` → `footer, [role=contentinfo]`
Document the map in the task body. (The check matrix shape — breakpoint × region × state —
is unchanged.)

### 3. `design/tasks/capture-reference.md`
Honor `check.selector` for the reference: when set, use the **element-capture** mode
(crop the reference to that element); when empty, full-page (region `full`) or the existing
landmark behavior. Mirror what `capture-storybook` already does for the story.

### 4. `design/rules/playwright-capture.md`
Clarify that the element-capture mode applies to the **reference** as well as the story,
keyed on `check.selector`; the "selector matches nothing → fall back / skip with warning"
constraint is what keeps the entity story full while the reference crops.

### 5. `design/schemas.yml` — `Check.selector`
Update the description: the selector targets the region in **both** the story and the
reference capture (was "limits the capture to a subregion of the story render").

## Out of scope
- Cropping the cached full-page reference screenshot by bbox (region_properties). We reuse
  live Playwright element-capture, which already exists and needs no addon code.
- Content-check stage (still deferred).

## Testing
- `designbook-skill-creator` rules loaded before editing any task/rule/schema.
- Re-run `/debo test drupal-web design-verify-entity-signage`: the reference is cropped to
  `app-signage`; compare measures the signage region vs the component → a meaningful diff
  (not 78% full-page mismatch), dimensions comparable.
- Re-run a shell verify case (`design-verify-shell`): header/footer still crop correctly
  (now via explicit selectors) — no regression; the workflow completes.
- `pnpm check` green (no addon code changed, but run the gate).
