---
trigger:
  steps: [create-component, create-scene]
  domain: [components, scenes]
---

# Markup Derivation

The markup produced by `create-component` (templates, e.g. Twig/SDC) and the slot HTML produced by `create-scene` MUST be derived from the concrete structure captured in the `DesignReference` (`extract.json`) — not from generic assumptions about what a "header" or "footer" typically looks like.

Generic templates that ignore the reference are the root cause of triage-noise in `design-verify`. Every mismatch caught in compare has a corresponding gap between the reference and the rendered markup — this rule eliminates that gap at the source.

## Binding Derivations

### Landmark rows → row structure

When the component represents a landmark region (`header`, `footer`), its template MUST expose one row wrapper per `landmarks.<region>.rows[]` entry. Each row wrapper:

- Uses the row's `bg`, `height`, `padding`, and `gap` as the concrete styling target.
- Exposes its row items as a named slot (or as a nested loop fed by props) — not as hard-coded markup.
- Renders items in the order given by `content`.

A single landmark with multiple rows MUST NOT collapse into one flex container.

### Items → discrete slots or typed props

Items inside a row (logo, search, login, partner marks, social icons, …) MUST be discrete slots on the component — never hard-coded markup that ignores the variability captured in the reference. When items repeat (navigation entries, partner logos), expose them as an array prop/slot and iterate.

### Interactive elements → component references

Every item matching an entry in `interactive[]` MUST be rendered via the appropriate interactive component (`button`, `link`, …) and inherit its variant from the extracted properties (`bg`, `color`, `border_radius`, …). Custom inline `<a>` / `<button>` markup in a landmark template is forbidden when a matching interactive entry exists.

### Forms → form components

Every form area identified in `forms[]` MUST be rendered via the `form` blueprint's component family (`form_element`, `label`, `input`, `select`, `submit`, …) — not as inline `<form>`/`<input>` HTML. Field types, label positions, and placeholder/error states are taken from `forms[].fields[]` and `forms[].error_color`.

### Images → extracted assets

Every visible image in a component's region MUST be rendered from the matching `images[]` entry:

- `src` is the entry's `local_path`. If `local_path` is empty, re-run extraction — do not invent a placeholder or substitute styled text.
- `alt` comes from `images[].alt` when present; otherwise from the item's semantic label.
- `width`/`height` from the entry (to avoid layout shift).
- Inline SVGs captured as markup are rendered with `{{ svg|raw }}` / `{% include %}` — not re-emitted as `<img>` with a hallucinated URL.

Partner logos, brand marks, and social icons always resolve to an asset — text spans styled to look like logos are forbidden.

### Navigation → navigation[] entries

Navigation component markup MUST iterate over `navigation[]` entries whose `role` matches the component context (`main` for header nav, `footer` for footer nav, …). Labels, URLs, and `active` state are preserved exactly; nested children produce nested markup one level deep.

### Breakpoint variance → responsive markup

When `breakpoints[]` records a layout change for the component's region, the template MUST accommodate it (e.g. nav collapsing into a disclosure at `md`). Do not ship desktop-only markup when the reference shows a responsive difference.

## Verification

Before emitting the template/scene, cross-check it against the reference:

- Count the row wrappers — it MUST equal `landmarks.<region>.rows.length`.
- Count the `<img>`/inline-SVG references in the region — it MUST equal `images[]` entries with matching `location` and non-empty `local_path`.
- No inline `<form>` or `<input>` tags in a region that has a matching `forms[]` entry.
- No text span styled as a brand mark where an `images[]` entry exists.

A template that fails any of these checks is not complete — fix the derivation before returning the result.
