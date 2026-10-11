---
trigger:
  steps: [create-tokens]
---

# Reference-derived tokens

The task's `extract` is the authoritative `DesignReference` for the selected
subjects, views and states. Observed values live in
`subjects[].samples[].observations`, with font dependencies in `fonts[]`.
The source's material keys remain source-specific; preserve their meaning and
units instead of assuming a flat color or typography table.

## Values and provenance

Every primitive value must be supported by the selected observations: colors
and opacity, font families, sizes and weights, line heights, spacing and radii.
A line-height ratio may be calculated from observed line height and font size;
preserve its precision. Semantic names and grouping may be inferred, but new
primitive values require explicit intake decisions identified as additions.
Record the selected revision and scope, and distinguish observations, calculated
values and additions in token descriptions or Designbook extensions.

## Coverage

Represent every observed text treatment in `semantic.typography` and every named
observed color in `semantic.color`. Typography roles reference matching primitives
for family, size, weight, line height and color wherever those values are observed.
Figma text styles are treatments even when no HTML element name is available.
Resolve missing required values during intake; an observation gap is not evidence
for a conventional default. Preserve differences between selected views and states.

## Reference-free input

Only a request without a reference uses the palette, fonts and scales recorded
as intake decisions. A missing or invalid supplied reference blocks the task.
