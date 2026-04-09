## MODIFIED Requirements

### Requirement: Brand override primitives take precedence for semantic color roles

The `stitch-tokens.md` rule SHALL enforce that semantic tokens for brand-aligned roles (`primary`, `secondary`, `tertiary`, and all their derivatives like `primary_container`, `on_primary`, etc.) MUST reference the primitive derived from the brand override, not from Delta-E approximation against other primitives.

#### Scenario: Primary semantic references brand override primitive
- **WHEN** the Stitch project has `overridePrimaryColor: #0366D6`
- **THEN** the primitive `blue-600` (or nearest scale step) is created from the override, and `semantic.color.primary` references that primitive — not a lighter variant from Delta-E approximation

#### Scenario: Delta-E approximation excluded for brand roles
- **WHEN** a `namedColors` entry like `primary` (#004fa8) is within RGB distance < 8 of an existing primitive like `blue-200`
- **THEN** the Delta-E approximation is NOT applied because `primary` is a brand-aligned role — the brand override primitive takes precedence

#### Scenario: Delta-E approximation still applies to non-brand roles
- **WHEN** a `namedColors` entry like `outline_variant` is within RGB distance < 8 of an existing primitive
- **THEN** the Delta-E approximation MAY reference that primitive (existing behavior preserved)

### Requirement: Explicit brand-role-to-namedColor mapping

The `stitch-tokens.md` rule SHALL document the explicit mapping from brand overrides to namedColor role families:

- `overridePrimaryColor` → `primary`, `primary_container`, `on_primary`, `on_primary_container`, `inverse_primary`
- `overrideSecondaryColor` → `secondary`, `secondary_container`, `on_secondary`, `on_secondary_container`
- `overrideTertiaryColor` → `tertiary`, `tertiary_container`, `on_tertiary`, `on_tertiary_container`

#### Scenario: Primary family semantics use primary hue
- **WHEN** semantics like `primary_container` and `on_primary` are derived
- **THEN** they reference primitives from the same hue family as the brand override primitive, not from Delta-E approximation against unrelated hues
