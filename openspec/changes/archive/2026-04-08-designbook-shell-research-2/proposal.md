## Why

The `--research` audit of a design-shell workflow run revealed three coherence issues in the skill file system: (1) the polish task can produce changes that violate hard constraints from loaded rules, (2) inspect-stitch depends on a Playwright session started by inspect-storybook but this dependency is implicit, and (3) scenes-constraints.md duplicates content already present in create-scene task files, creating maintenance divergence risk.

## What Changes

- **polish.md**: Add a rule-compliance check — before applying any fix, verify it doesn't contradict loaded rules (specifically layout-constraints). Document that container/max-width must be handled by wrapping in container component, not by adding classes to leaf components.
- **inspect-stitch.md**: Add explicit `depends_on: inspect-storybook` or document session prerequisite in frontmatter so the dependency is discoverable.
- **Shell component blueprints**: Create blueprints for all shell components (page, navigation, header, footer) — same pattern as existing layout blueprints (container, grid, section). Navigation blueprint includes Drupal MenuLinkTreeElement structure; content moves from component-patterns.md. Fix stale step name in navigation rule (`debo-design-system:intake` → `design-shell:intake`). Trim rule to hard constraint only.
- **scenes-constraints.md**: Remove duplicated instructional content that belongs in task files (inline-all, provider-prefix examples). Keep only the hard constraint declarations.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

_None — these are skill file fixes, not spec-level requirement changes._

## Impact

- `.agents/skills/designbook/design/tasks/polish.md` — constraint-awareness addition
- `.agents/skills/designbook-stitch/tasks/inspect-stitch.md` — dependency declaration
- `.agents/skills/designbook-drupal/components/blueprints/page.md` — new blueprint
- `.agents/skills/designbook-drupal/components/blueprints/navigation.md` — new blueprint
- `.agents/skills/designbook-drupal/components/blueprints/header.md` — new blueprint
- `.agents/skills/designbook-drupal/components/blueprints/footer.md` — new blueprint
- `.agents/skills/designbook-drupal/shell/rules/navigation.md` — stale step name fix + trim
- `.agents/skills/designbook-drupal/components/resources/component-patterns.md` — extract navigation section
- `.agents/skills/designbook/design/rules/scenes-constraints.md` — content reduction
