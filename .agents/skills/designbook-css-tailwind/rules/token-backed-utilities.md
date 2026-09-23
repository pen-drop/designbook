---
trigger:
  domain: components
filter:
  frameworks.css: tailwind
---

# Token-Backed Utility Scale

When porting a design reference into a component, every styling effect in the
markup MUST be expressed using the established utility scale — snapping values to
the existing spacing/sizing/color/typography steps — never an arbitrary value and
never a component-specific dimension-token alias invented to pixel-match the
reference.

## The Twig/markup IS the stylesheet

A correct port carries the component's entire look in its markup `class`
attributes — a reviewer must see how the component looks by reading the markup
alone, not a parallel component-scoped stylesheet that re-declares the same
properties the utilities already express.

A component-scoped partial that re-declares the ported styling verbatim (raw
`display`/`padding`/`margin`/`background`/`border`/`color`/`font`/`gap`/`flex`/`grid`
declarations keyed on carried-over source class names) is the explicit failure
this rule exists to prevent — it relocates the styling, it does not convert it.
"Ported into a partial" is not done; the work is done only when the styling lives
in utilities.

None of the following are an escape hatch for reaching outside the utility scale:
a media query (use the project's named breakpoints), a descendant element (put the
utility on that element directly in markup), a pseudo-class/element (use named
variants). Every arbitrary utility value — including an arbitrary `var(...)` form
or an optical nudge — is prohibited. When no existing named utility and no central
token fit, record the missing token as a finding; do not substitute a literal or
arbitrary value to make progress.

## Scale wins on collision — do not clone the reference's raw pixels

A design reference's own spacing/sizing scale does not necessarily equal the
project's Tailwind scale, and class names can collide numerically between the two
systems even when they look similar. **The project's Tailwind scale is the source
of truth for the new design system — it always wins on collision.**

- Map a reference class to the **same-intent Tailwind utility** and accept the
  Tailwind scale's value. Do not reproduce the reference's raw pixel value with an
  arbitrary utility just to pixel-match the source.
- Where no clean same-name match exists, snap to the nearest standard Tailwind
  utility that fits the intent, rather than an arbitrary px value.
- Use established spacing/sizing steps directly. Do not introduce dimension tokens
  or component-specific utilities for ordinary padding, margins, gaps, sizes, or
  offsets — snap to the nearest existing step instead of inventing a new one.
  A newer Tailwind version accepting additional numeric/fractional classes does not
  make them part of this project's established scale.
- Do not reproduce a component's old measurements as a family of narrowly named
  tokens. First use standard spacing, sizing, radius, typography, and responsive
  layout utilities. Central tokens are for shared design decisions, not aliases for
  individual pixel offsets.
- There are no arbitrary-value exceptions — not brand hex values, not exact grid
  tracks, not optical alignment. A genuinely reusable value goes into the project's
  maintained central token source and is exposed as a named utility through the
  project's token workflow; it never lands directly in markup, an inline style, or a
  component partial.
- Consequence: a ported component's spacing may differ from the design reference
  by named token steps. That difference is expected and accepted by visual
  comparison tooling — do not chase it with arbitrary px values.

## Constraints

- **Forbid** emitting any utility class with no backing CSS declaration — an
  invented, approximated, or unresolved class name is a hard error.
- **Forbid** carrying the design reference's own custom class names directly into
  the markup without resolving them to actual CSS and expressing that CSS as
  utilities.
- **Forbid** carrying over a source CSS-framework's utility class names (from
  Bootstrap or similar) directly; resolve them to CSS and re-express as this
  project's utilities.
- Use existing semantic or primitive color tokens by name; never a literal color
  value or an arbitrary `var(...)` utility at a component call site.

## Existing central tokens — do not regenerate curated CSS

A named utility only resolves if its token already exists in the committed
token CSS. Never invent a token name or an arbitrary `var(...)` utility. When the
ported styling needs a value with no matching central token:

1. For ordinary dimensions, select the nearest established step instead of adding
   a token. Only a genuinely shared design decision — absent from the existing
   scale — justifies introducing a meaningful new central token, added through the
   project's maintained token-update path.
2. If the safe update path is unavailable, leave the finding open until a central
   token and named utility are added. Do not move a literal into markup, an inline
   style, or a partial as a stopgap.

After any token change, rebuild the compiled CSS so the named utility and token
actually land in the built stylesheet — editing a markup `class` or a partial has
zero visual effect until that rebuild runs. Verify both the preview surface and
the production runtime after rebuilding, rather than assuming either the source or
the compiled CSS alone is authoritative.

## Escape hatch — narrow

Utilities-in-markup is the default. A component-scoped partial exists only for a
narrow effect a class-on-element utility genuinely cannot reach:

- JS-toggled state-class combinations on the same element (a class a behavior
  script flips at runtime, styled in combination with a base state). Express the
  base state with utilities in the markup; the partial carries only the toggled
  delta.
- `@keyframes` definitions.
- Uncontrolled raw markup (an unescaped HTML blob the component does not own) is
  not an automatic exception — record it as a conflict; do not add a descendant
  selector to reach into it.

When a partial is unavoidable:

- One partial per component.
- Use the utility-application directive (e.g. `@apply <utility>`) for every
  declaration that has a utility equivalent; raw CSS only for the truly
  unexpressible remainder.
- The partial is imported into the project's compiled entrypoint per the project's
  own build wiring.
- A one-line comment per rule states which narrow reason above justifies it.
- A component that needs no escape-hatch rule has no partial — do not create an
  empty or redundant one.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| TBU-01 | error | Every utility class in the markup has a resolved CSS declaration; no invented or unevaluated class names | component markup |
| TBU-02 | error | No design-reference custom class names or source-framework utility class names appear unresolved in the markup | component markup |
| TBU-03 | error | A component-scoped partial, when present, is wired into the project's compiled entrypoint per its own build convention | build entrypoint |
| TBU-04 | error | Colors use existing semantic or primitive named tokens; no literal or arbitrary `var(...)` utility appears at a call site | component markup / partial |
| TBU-05 | error | The component's static look lives in utility classes in the markup, not in a partial; a partial re-declaring utility-expressible properties is a violation | component markup / partial |
| TBU-06 | error | A partial contains only narrow escape-hatch rules (JS-state combinations or `@keyframes`); media queries, pseudo-classes, controllable descendants, and uncontrolled-markup substitutions are not in the partial | partial |
| TBU-07 | error | Reference-scale spacing/sizing classes map to same-intent utilities on this project's scale, with no arbitrary-value cloning of the reference's raw pixels | component markup |
