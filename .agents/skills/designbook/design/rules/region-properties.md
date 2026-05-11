---
name: designbook:design:region-properties
trigger:
  steps: [create-component, create-scene]
---

# Region Properties

When `region_properties` is set and `region_properties.matched_via !== "none"`:

- The `nodes[]` describe the actual rendered subtree of the region this task covers.
- The `style` values on those nodes are ground truth. Use them 1:1 in markup and CSS.
- Do not guess values that are present in `style`. Only fall back to design tokens
  and `design_hint` for properties not in the bag.
- The `bbox` and `kind` fields anchor the structural decisions (e.g. flex direction,
  grid layout) — derive the markup hierarchy from the node tree, not from the
  screenshot alone.

When `region_properties` is missing or `matched_via === "none"`, run with the
previous behavior: derive from `reference` (extract.json) + `design_hint` only.

## Why two artifacts converge here

`reference` (from `extract-reference`) is an AI-curated **table of contents** —
which sections, landmarks, forms, and breakpoints exist on the page.

`region_properties` is a deterministic **detail layer** — for the specific
region this task covers, the exact computed properties of every visible
element.

Both are valid inputs. Use `reference` for structural decisions about which
component cuts to make and which content belongs where. Use `region_properties`
for the per-element styling once the cut is decided.
