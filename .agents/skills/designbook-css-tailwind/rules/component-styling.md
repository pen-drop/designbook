---
trigger:
  domain: components
filter:
  frameworks.css: tailwind
---

# Tailwind Component Styling

Express the component's static appearance in named utility classes backed by
compiled CSS. Use the project's established spacing, sizing, typography, color,
radius and breakpoint scales. Map reference values to the nearest same-intent
step; differences caused by this mapping are accepted during visual comparison.

Resolve source-framework and custom classes to their styling intent before
mapping them. Behavior/test hooks may remain, with styling carried by utilities.
Arbitrary-value utilities (including `var(...)` forms), literal colors and
component-specific pixel aliases are prohibited.

Use shared semantic or primitive color tokens by name. For non-standard token
namespaces, expose shared decisions through maintained named `@utility` rules.
A missing shared token or utility is a finding; plan its central token/build
update as a prerequisite. Ordinary dimensional differences use the established
scale. Verify emitted classes have CSS declarations after rebuilding, in both
preview and production when those surfaces are in scope.

## Component CSS exceptions

A component partial may contain JS-toggled state combinations or `@keyframes`
that utilities on the element cannot express. Keep base styles in markup; the
partial carries only the exceptional delta. Use `@apply` where a utility exists,
raw CSS for the remaining effect, and one comment per rule naming the exception.
Import the partial through the project's build entrypoint; omit empty partials.

Responsive changes, pseudo-states and controlled descendants use markup utilities.
Uncontrolled raw markup needing descendant styling remains an explicit conflict.
Shared imports, `@theme`, `@source` and named `@utility` definitions belong to the
CSS infrastructure.

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
