## 1. Polish task rule-compliance guard

- [x] 1.1 In `polish.md`, add a "Rule Compliance" section before the fix-application step: "Before applying any fix, verify it does not contradict loaded rules. Specifically: never add max-width, horizontal padding, or width constraints directly to a component — use container wrapping instead (per layout-constraints.md)."
- [x] 1.2 Add an explicit example showing the wrong pattern (adding `max-w-*` to a component twig) vs the correct pattern (wrapping in container component in the scene)

## 2. inspect-stitch session dependency

- [x] 2.1 Add `requires: [inspect]` to `inspect-stitch.md` frontmatter — documents that this task expects a Playwright session already started by the inspect-storybook task
- [x] 2.2 Add a note at the top of the task body: "This task requires an active Playwright session from the inspect step. If no session is available, start one first."

## 3. Shell component blueprints

Create blueprints for all shell components — same pattern as existing layout blueprints (container.md, grid.md, section.md). Each blueprint defines the component structure, props, slots, and a Twig pattern reference.

- [x] 3.1 Create `designbook-drupal/components/blueprints/page.md` — page shell wrapper. Slots: header, content, footer. No props. `when: steps: [design-shell:intake]`. Use for: the top-level page wrapper that composes header + content + footer.
- [x] 3.2 Create `designbook-drupal/components/blueprints/navigation.md` — Drupal navigation component. Props: variant (enum: main, footer), items (array of Drupal MenuLinkTreeElement: title, url, in_active_trail, below). `when: steps: [design-shell:intake, design-screen:intake]`. Include the Twig macro pattern for recursive menu rendering. Move the "Navigation Components" section from `component-patterns.md` (lines 45-143) into this blueprint; keep a one-line reference in component-patterns.md pointing to the blueprint.
- [x] 3.3 Create `designbook-drupal/components/blueprints/header.md` — site header component. Slots: logo, navigation, actions. `when: steps: [design-shell:intake]`. Use for: fixed/sticky header with logo, nav, and action buttons (search, CTA).
- [x] 3.4 Create `designbook-drupal/components/blueprints/footer.md` — site footer component. Slots: brand, links. Props: copyright (string). `when: steps: [design-shell:intake]`. Use for: page footer with brand area and link groups.
- [x] 3.5 Fix `designbook-drupal/shell/rules/navigation.md` — change stale `when: steps: [debo-design-system:intake]` to `when: steps: [design-shell:intake, design-screen:intake]`. Trim content that now lives in the navigation blueprint (props, variants). Keep only the hard constraint: "Header and footer must always include a navigation component as a required slot."
- [x] 3.6 Verify all 4 new blueprints are loaded during `workflow create --workflow-file design-shell.md` by checking `step_resolved.design-shell:intake.blueprints`

## 4. scenes-constraints deduplication

- [x] 4.1 In `scenes-constraints.md`, remove the "Shell scenes: inline all slots" example block (lines ~47-76) — this is instructional content that belongs in create-scene task files, not in a constraint rule
- [x] 4.2 Keep the one-line constraint declaration: "Shell scenes MUST inline ALL sub-component slots — never use `story: default` alone"
- [x] 4.3 Verify that `create-scene--design-shell.md` already contains the inline-all instruction (it does — "Inline everything" in Constraints section)
