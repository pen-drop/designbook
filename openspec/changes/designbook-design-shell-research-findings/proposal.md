## Why

The design-shell workflow produces structurally correct components but fails to render slot content in Storybook due to missing `{% block %}` wrappers in layout components, identifies too few atomic components (buttons rendered as inline HTML), and lacks inspection steps that would catch rendering issues earlier. A research audit of 25 loaded skill files revealed domain violations (Tailwind/Drupal logic in core rules), task/rule contradictions, constraint duplication across blueprints and rules, and a redundant compare-markup stage.

## What Changes

- **Container blueprint**: Mandate `{% block %}` wrappers around all slot outputs in layout components (container, section, grid) for `{% embed %}` compatibility
- **SDC conventions rule**: Add `{% block %}` requirement for embeddable components
- **Scenes constraints rule**: **BREAKING** — Split into core (inline styles, duck-typing, `$content`) + integration rules in `designbook-drupal/` (entity format, image nodes, listing scenes) and `designbook-css-tailwind/` (Tailwind reasoning)
- **Create-component task**: Fix CLI prefix (`designbook` → `_debo`), move Tailwind `@source` logic to `designbook-css-tailwind/`, add inspection step (read existing files + check Storybook before generating)
- **Setup-compare task**: Add mandatory Storybook restart (`_debo storybook start --force`) before capture stages
- **Polish task**: Add inspection step — read generated components, scene YAML, and check Storybook rendering before applying fixes
- **Intake task (design-shell)**: Increase component extraction aggressiveness — identify atomic UI elements (button, badge, icon, search) as components instead of inline HTML; include container as shell component
- **Remove compare-markup stage**: Redundant with screenshot comparison; the `each: checks` iteration produces 6 identical extractions for one scene-level concern
- **Rename outtake**: `outtake--design-screen.md` → `outtake--design.md` to match actual scope (covers design-shell + design-screen + design-verify)
- **Capture-reference task**: Remove stale Node API references that contradict `playwright-capture.md` rule
- **Typography-tokens rule**: Generalize Tailwind-specific terminology to framework-agnostic language
- **Blueprint cleanup**: Remove `MUST`/`never` constraint language from `grid.md`, `container.md`, `header.md` — defer to existing rules
- **Title interpolation bug**: `expandParams` in `workflow-resolve.ts` calls `String()` on array/object params, producing `[object Object]` in task titles (e.g. `Triage: [object Object]`). Fix to extract a meaningful string from structured params.
- **`component_design_hints` workflow param**: Intake extracts design reference (landmarks, fonts, colors, interactive patterns) but does not pass the structured extraction data as a workflow param. Add `component_design_hints` param to intake output so `create-component` and `polish` tasks can access the design reference data directly without parsing the markdown file.

## Capabilities

### New Capabilities
- `embed-block-convention`: Establish the `{% block %}` wrapping convention for SDC layout components used with `{% embed %}`, including blueprint requirements and rule enforcement
- `component-inspection-step`: Add a mandatory "inspect what exists" phase to create-component and polish tasks — read files, check Storybook rendering before acting
- `component-design-hints`: Pass structured design extraction data (landmarks, fonts, colors, interactive patterns) as `component_design_hints` workflow param from intake to downstream tasks

### Modified Capabilities
- `scene-conventions`: Remove compare-markup stage references, update scene constraint ownership (split Drupal/Tailwind concerns out of core)
- `design-workflow-compare`: Remove compare-markup as a workflow stage, update stage flow documentation
- `layout-components`: Add `{% block %}` requirement to container/section/grid blueprints, remove constraint duplication with rules
- `designbook-drupal`: Receive entity format, image node, and listing scene constraints from core `scenes-constraints.md` split

## Impact

- **Skill files affected**: ~15 files across `designbook/`, `designbook-drupal/`, `designbook-css-tailwind/`
- **Workflow definitions**: `design-shell.md`, `design-screen.md` — remove compare-markup stage
- **Blueprints**: `container.md`, `grid.md`, `header.md` — update content
- **Rules**: `scenes-constraints.md` (split), `sdc-conventions.md` (extend), `typography-tokens.md` (generalize)
- **Tasks**: `create-component.md`, `polish.md`, `setup-compare.md`, `capture-reference.md`, `intake--design-shell.md`, `outtake--design-screen.md` (rename)
- **CLI**: `expandParams` in `workflow-resolve.ts` — fix `String()` call for array/object params
- **Skill files affected**: ~15 files across `designbook/`, `designbook-drupal/`, `designbook-css-tailwind/`
