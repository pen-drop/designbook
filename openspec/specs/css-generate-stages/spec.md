# css-generate-stages Specification

## Purpose
Defines the stages-based architecture for CSS generation — framework skills self-register via task files, removing the central registry and enabling open extension.

## Requirements

### Requirement: CSS framework skills self-register via task files
Each CSS framework skill SHALL provide a `tasks/generate-jsonata.md` file with `when: frameworks.css: <framework>` to participate in the CSS generation pipeline. No central registry SHALL exist.

#### Scenario: DaisyUI framework selected
- **WHEN** `DESIGNBOOK_FRAMEWORK_CSS=daisyui`
- **THEN** Rule 1 discovery selects `designbook-css-daisyui/tasks/generate-jsonata.md` for the `generate-jsonata` stage

#### Scenario: Tailwind framework selected
- **WHEN** `DESIGNBOOK_FRAMEWORK_CSS=tailwind`
- **THEN** Rule 1 discovery selects `designbook-css-tailwind/tasks/generate-jsonata.md` for the `generate-jsonata` stage

#### Scenario: Unknown framework
- **WHEN** `DESIGNBOOK_FRAMEWORK_CSS` is set to an unknown value
- **THEN** no task file matches the `generate-jsonata` stage and the workflow reports an error listing supported frameworks

### Requirement: debo-css-generate uses stages architecture
The `debo-css-generate` workflow SHALL declare `stages: [generate-jsonata, generate-css]` in its frontmatter and follow the standard stages workflow pattern (Rule 0 resume check, Rule 1 plan, Rule 2 execution).

#### Scenario: Workflow plan created
- **WHEN** the workflow starts and no existing workflow is found
- **THEN** `workflow create` is called with stages `["generate-jsonata", "generate-css"]` and the discovered task files

#### Scenario: Two tasks created
- **WHEN** `workflow create` completes
- **THEN** the workflow has exactly two tasks: one for `generate-jsonata` and one for `generate-css`

### Requirement: Generic pipeline steps in generate-css task
`designbook-css-generate/tasks/generate-css.md` (no `when`) SHALL contain the complete generic pipeline: run all `.jsonata` files via `jsonata-w transform`, update `app.src.css` imports, verify output files exist and are non-empty.

#### Scenario: Generic task applies to all frameworks
- **WHEN** any CSS framework is configured
- **THEN** `designbook-css-generate/tasks/generate-css.md` is selected for the `generate-css` stage (no `when` = universal fallback)

#### Scenario: Transforms executed
- **WHEN** the `generate-css` task runs
- **THEN** all `.jsonata` files in `$DESIGNBOOK_DIST/designbook-css-<framework>/` are executed via `npx jsonata-w transform`

### Requirement: DaisyUI generate-jsonata includes layout tokens
Because DaisyUI extends Tailwind, `designbook-css-daisyui/tasks/generate-jsonata.md` SHALL generate `.jsonata` expression files for both DaisyUI-specific tokens (color, font) AND Tailwind structural tokens (layout-width, layout-spacing, grid).

#### Scenario: DaisyUI project generates all token groups
- **WHEN** `DESIGNBOOK_FRAMEWORK_CSS=daisyui` and the `generate-jsonata` task runs
- **THEN** `.jsonata` files are created for `color`, `font`, `layout-width`, `layout-spacing` token groups

### Requirement: delegate-framework.md step removed
The `designbook-css-generate/steps/delegate-framework.md` file and its hardcoded framework registry SHALL be removed. Framework delegation is handled entirely by stage-discovery (Rule 1).

#### Scenario: New framework added without editing orchestrator
- **WHEN** a new CSS framework skill is created with `tasks/generate-jsonata.md`
- **THEN** the framework is automatically available without modifying any existing file
