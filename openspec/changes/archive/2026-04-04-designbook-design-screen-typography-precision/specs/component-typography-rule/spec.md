## ADDED Requirements

### Requirement: Components must use typography tokens for font sizing

A core rule SHALL enforce that components reference typography scale tokens instead of arbitrary Tailwind utility classes for font sizes, weights, and line heights.

#### Scenario: Rule loaded for create-component step
- **WHEN** the `create-component` step runs
- **THEN** a rule SHALL be loaded that requires components to use `var(--text-*)` or the corresponding Tailwind `text-*` utility for font sizing
- **THEN** arbitrary size classes (e.g., `text-sm`, `text-lg`, `text-2xl`) SHALL NOT be used when a matching typography token exists

#### Scenario: Rule allows fallback for non-scale sizes
- **WHEN** a component needs a font size that does not correspond to any typography scale role
- **THEN** the rule SHALL allow arbitrary Tailwind utilities with a comment explaining why no token fits

#### Scenario: Rule applies to font-weight and line-height
- **WHEN** a component sets font-weight or line-height
- **THEN** it SHALL use the composite token values via `var(--text-<role>--weight)` and `var(--text-<role>--line-height)` where a matching role exists
