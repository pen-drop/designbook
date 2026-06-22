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

**A region IS a named selector** — not a fixed semantic landmark. The old model
(`RegionId` enum `full`/`header`/`footer` + a separate `selector` + a hardcoded
landmark→selector map) is misleading: it pretends header/footer are fixed things, when
each is just an identifier for a CSS selector that differs per reference site.

Diagnosis on leando.de (Angular): `header, [role=banner]` matches **nothing** (count 0) —
the real header is `<app-site-header>`; the footer is `<app-footer>`; signage is
`<app-signage>`. Hardcoded landmark defaults can never be right across sites.

A region is a named selector **pair** — one selector per surface, because the story DOM
(design-system components) differs from the reference DOM:

```yaml
Region: { id: <string>, selector: <story css>, reference_selector: <reference css> }
# selector "" ⇒ full story viewport; reference_selector "" ⇒ full reference page
```

- `id` — clean label for the screenshot filename and score (`header`, `footer`, `full`)
- `selector` — crops the STORY capture (e.g. shell `.page__header`); `""` ⇒ full story
- `reference_selector` — crops the REFERENCE capture (e.g. `app-site-header`); `""` ⇒ full page

`Check.region` = `id`; `Check.selector` = story crop (consumed by capture-storybook + the
in-app visual-compare tool — unchanged addon contract); `Check.reference_selector` =
reference crop (consumed by capture-reference). The "selector matches nothing → fall back
to full / skip with warning" rule still holds per side.

Why two: leando.de's header is `<app-site-header>` while the rendered shell story's header
is `.page__header` — a single selector can crop one DOM but not the other. An entity story
is an isolated component (story `selector: ""` = full), so only the reference needs cropping.

Examples:
- Entity: `[{ id: full, selector: "", reference_selector: app-signage }]`
- Shell:  `[{ id: header, selector: .page__header, reference_selector: app-site-header },
            { id: footer, selector: .page__footer, reference_selector: app-footer }]`
- Screen / whole page: `[{ id: full, selector: "", reference_selector: "" }]`

## Changes (skill-only — capture is agent-driven via `playwright-cli`, no addon code)

### 1. `design/schemas.yml` — `Region` object; loosen `RegionId`
- `RegionId`: drop the `enum [full, header, footer]` → free string (region identifier).
- Add `Region: { id: RegionId, selector: string }` (selector "" ⇒ full page).
- `Check.region` stays the `id`. `Check.selector` description: the crop target for BOTH
  story and reference, sourced from the region's selector; "" ⇒ full capture; non-match ⇒
  fall back to full (never fail).

### 2. `design/workflows/design-verify.md`
Replace the single `selector` param with `regions: { type: array, default: [] }` — a list
of `Region {id, selector}` provided by the caller. Threaded into `setup-compare`.

### 3. `design/tasks/setup-compare.md`
`regions` param becomes a list of `Region {id, selector}` (was `RegionId` enum). Remove the
hardcoded landmark→selector map. Each emitted check carries `region = region.id` and
`selector = region.selector`. Default when none provided: `[{ id: full, selector: "" }]`.
(Matrix shape — breakpoint × region × state — unchanged.)

### 4. `design/tasks/capture-reference.md`
Honor `check.selector` for the reference: non-empty ⇒ element-capture (crop the reference
to that selector); empty ⇒ full-page. Mirror `capture-storybook`. *(Already done.)*

### 5. `design/rules/playwright-capture.md`
Element-capture mode applies to the **reference** as well as the story, keyed on
`check.selector`; non-match ⇒ full-page fallback. *(Already done.)*

### 6. Verify cases provide real selectors
- `cases/design-verify-entity-signage.yaml`: regions `[{id: full, selector: app-signage}]`.
- Shell verify: regions `[{id: header, selector: app-site-header}, {id: footer, selector: app-footer}]`.
- design-shell after-hook passing region selectors is a follow-on (noted, not in scope).

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
