# Tailwind Workflow Policy Design

## Goal

Designbook-generated components should use the active CSS framework correctly. For Tailwind workspaces, generated component styling should be expressed with Tailwind utility classes backed by Designbook tokens. Component generation should not create BEM-style styling classes or append ordinary component CSS to external stylesheets when Tailwind can express the design.

## Scope

This design covers skill and workflow guidance only. It explicitly does not add addon validators or runtime enforcement.

In scope:

- Tailwind v4 styling policy in `designbook-css-tailwind`.
- Framework-neutral component generation guidance in `designbook-drupal` that consumes the active CSS framework policy.
- Design workflow guidance for issues observed in the `drupal-web design-shell` research run.
- Existing token CSS generation expectations for Tailwind `@theme`.
- Research findings from the design-shell run: landmark region fidelity, interaction treatment fidelity, token-class usage, token CSS freshness, story/variant id safety, and compare dimension reporting.

Out of scope:

- Adding validation logic to `packages/storybook-addon-designbook`.
- Making `designbook-css-tailwind` aware of Drupal, SDC, Twig, or slots.
- Adding migration or backwards-compatibility handling for old generated artifacts.

## Architecture

`designbook-css-tailwind` remains framework-agnostic. It defines only how Tailwind styling should be authored:

- Use Tailwind utilities as the default styling surface.
- Prefer utilities generated from Designbook tokens.
- Use standard Tailwind token namespaces directly, such as `bg-primary`, `text-on-surface`, `font-heading`, and `rounded-pill`.
- Use arbitrary values for non-standard token namespaces, such as `max-w-[var(--container-xl)]` and `gap-[var(--grid-md)]`.
- Avoid external component CSS for layout, spacing, color, typography, borders, radii, and responsive behavior when Tailwind utilities can express the design.
- Keep app CSS focused on Tailwind infrastructure: imports, `@theme`, `@source`, and rare reusable `@utility` abstractions.

`designbook-drupal` remains responsible for SDC-specific mechanics:

- It decides how classes are attached in Twig or SDC templates.
- It uses the active CSS framework skill as the source of truth for class vocabulary.
- In Tailwind workspaces, it emits Tailwind utility classes through the normal SDC template class mechanism.
- It does not invent BEM classes for styling when Tailwind is active.

The design workflow remains responsible for visual completeness guidance:

- Reference extraction should identify visual landmarks and split each landmark into distinct regions when background, layout, purpose, content grouping, or interaction treatment changes.
- Scene and component generation should preserve those regions as separate slots, component parts, or nested components instead of collapsing them into one generic area.
- Compare guidance should treat large screenshot dimension drift as a structural issue before interpreting pixel diffs.

The addon and workflow CLI remain responsible for deterministic mechanics that are not styling policy:

- Story and variant identifiers used in generated filenames or Storybook exports must be safe identifiers before files are written.
- Workflow commands should consistently use the concrete workflow instance id returned by `workflow create` or resume output.

## Workflow Changes

Update Tailwind skill rules to define the styling policy without naming Twig or SDC.

Update Drupal component-generation guidance so CSS framework routing is explicit:

- Read the active CSS framework skill before authoring template classes.
- If Tailwind is active, classes in templates are Tailwind utilities.
- Do not append ordinary component selector blocks to the app stylesheet for Tailwind projects.
- Only touch app CSS when framework infrastructure is missing, such as a required `@source` directive.

Update design workflow guidance for shell generation:

- Model visually distinct landmark regions as distinct slots, component parts, or nested components instead of reusing one ambiguous slot.
- Preserve landmark region ordering and visual boundaries, including row, column, strip, panel, and form group changes.
- Classify interactive elements by visual treatment before mapping them to components or variants.
- Preserve observed interaction treatment instead of mapping every clickable element to a filled or accent button.
- Record dimension mismatches as explicit structural compare issues so incomplete landmarks are visible in workflow output.

Interaction treatment classes include:

- Text link.
- Transparent button.
- Icon-only button.
- Filled or accent button.
- Outline button.
- Input or search control.
- Menu or dropdown trigger, using whichever visual treatment the reference shows.

Update story-generation guidance:

- Normalize story and variant ids before using them in filenames or Storybook-facing identifiers.
- Preserve human-readable labels separately from safe ids, so labels may contain punctuation or hyphens without breaking generated exports.

Update workflow-operation guidance:

- Treat the concrete workflow instance name as the canonical command target after workflow creation.
- Avoid falling back to the base workflow id for `workflow done`, `workflow result`, or `workflow instructions` once a concrete instance exists.

## Research Issues Covered

The `drupal-web design-shell` research run produced these actionable issues:

1. **Tailwind styling policy** — generated components used BEM-style classes and appended component CSS to `app.src.css`. The workflow should generate Tailwind utility classes from tokens instead.
2. **Token CSS freshness** — existing generated token CSS contained stale token references that did not match the current `design-tokens.yml` structure. The CSS-generation workflow guidance should require regenerated token CSS to match the current token schema.
3. **Landmark region fidelity** — the generated shell collapsed visually distinct areas into ambiguous slots. Workflow guidance should split landmarks into regions whenever visual boundaries, purpose, layout, or content grouping changes.
4. **Structural completeness** — generated output can be substantially shorter than the reference when visible landmark groups are omitted. Workflow guidance should preserve all visible landmark regions before compare.
5. **Interaction treatment fidelity** — generated actions used an accent circular button where the reference used a transparent text control. Design extraction should classify controls by visual treatment instead of mapping every action to an accent button.
6. **Story id safety** — a hyphenated variant story generated invalid Storybook export code. Story generation should separate display labels from safe ids.
7. **Compare diagnostics** — screenshot comparison resized output before reporting the dimension mismatch. Compare guidance should report dimension drift explicitly as a design issue.
8. **Workflow instance targeting** — using the base workflow id for a running instance produced a wrong path lookup. Workflow operation guidance should keep using the concrete instance id.

## Testing

Manual workflow testing is sufficient for this change because no validators are added.

Use a fresh test workspace:

```bash
./scripts/setup-workspace.sh drupal-web
./scripts/setup-test.sh drupal-web design-shell --into workspaces/drupal-web
```

Run the `design-shell` workflow and inspect generated artifacts:

- Twig/SDC templates use Tailwind utility classes for styling.
- `css/app.src.css` contains imports and `@source` infrastructure, not generated BEM component selector blocks.
- Generated token CSS has the Tailwind `@theme` variables required by the utility classes.
- The shell scene preserves visually distinct landmark regions instead of collapsing them into ambiguous slots.
- Interactive controls use variants that match observed treatment, such as text-like, transparent, icon-only, outline, or filled.
- Output includes enough landmark structure to approach the reference dimensions.
- Story and variant filenames use safe ids while preserving readable labels in metadata.
- Compare output reports dimension drift separately from pixel diff when shell regions are structurally incomplete.

Run `pnpm check` before committing implementation changes.
