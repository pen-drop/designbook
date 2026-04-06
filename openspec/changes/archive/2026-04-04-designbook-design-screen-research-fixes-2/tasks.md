## 1. Canvas Examples

- [x] 1.1 Fix `designbook-drupal/sample-data/rules/canvas.md` — replace fictional component names (`canvas_section`, `canvas_text`, `canvas_image`, `canvas_cta`) with `COMPONENT_NAMESPACE:section`, `COMPONENT_NAMESPACE:hero` etc.
- [x] 1.2 Fix `designbook-drupal/data-mapping/blueprints/canvas.md` — replace fictional components and change `children` to `slots`

## 2. Extract Constraints from Blueprints to Rules

- [x] 2.1 Create `designbook-drupal/components/rules/layout-constraints.md` — extract "Never create domain-specific layout components" from `grid.md` and "No other component should apply its own max-width" from `container.md` into a single rule file with `when: steps: [create-component]`
- [x] 2.2 Remove the absolute constraint language from `designbook-drupal/components/blueprints/grid.md` — keep only overridable starting point
- [x] 2.3 Remove the absolute constraint language from `designbook-drupal/components/blueprints/container.md` — keep only overridable starting point

## 3. Deduplicate and Fix Metadata

- [x] 3.1 Remove duplicate `design-shell:intake` from `when.steps` in `designbook-drupal/components/blueprints/section.md`
- [x] 3.2 Remove duplicate `design-shell:intake` from `when.steps` in `designbook-drupal/components/blueprints/grid.md`
- [x] 3.3 Remove duplicate `design-shell:intake` from `when.steps` in `designbook-drupal/components/blueprints/container.md`
- [x] 3.4 Rename titles in `designbook-drupal/data-mapping/blueprints/views.md`, `layout-builder.md`, `field-map.md`, `canvas.md` — change "Rule:" prefix to "Blueprint:"

## 4. Content Coherence

- [x] 4.1 Fix `designbook-drupal/sample-data/rules/link.md` — align description with example (both should show the same data format)
- [x] 4.2 Simplify `designbook-devtools/rules/devtools-context.md` — reduce full JS code blocks to pseudocode, keep the constraint ("collect computed styles alongside screenshots"). Add a visible user-facing warning when DevTools MCP server is not running (not just a silent skip)
- [x] 4.3 Fix `designbook-drupal/components/tasks/create-component.md` — rephrase "MANDATORY: Change the app css" as an output declaration in `files:` or move to a rule
