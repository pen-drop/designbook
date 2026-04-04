# css-generate-stages Specification

## Purpose
Defines the stages-based architecture for CSS generation — framework skills self-register via task files, removing the central registry and enabling open extension.
## Requirements
### Requirement: CSS framework skills self-register via task files
Each CSS framework skill SHALL provide a `rules/css-mapping.md` rule file with `when: frameworks.css: <framework>` to participate in the CSS generation pipeline. Framework skills SHALL NOT provide `tasks/generate-jsonata.md`. The generic `generate-jsonata` task in `designbook/css-generate` reads the css-mapping rule and generates JSONata templates accordingly.

#### Scenario: Tailwind framework selected
- **WHEN** `DESIGNBOOK_FRAMEWORK_CSS=tailwind`
- **THEN** `designbook-css-tailwind/rules/css-mapping.md` is loaded for the `generate-jsonata` step
- **AND** the generic `designbook/css-generate/tasks/generate-jsonata.md` generates templates based on the mapping

#### Scenario: DaisyUI framework selected
- **WHEN** `DESIGNBOOK_FRAMEWORK_CSS=daisyui`
- **THEN** `designbook-css-daisyui/rules/css-mapping.md` is loaded for the `generate-jsonata` step
- **AND** the generic `generate-jsonata` task generates templates based on the DaisyUI mapping

#### Scenario: Unknown framework with no css-mapping rule
- **WHEN** `DESIGNBOOK_FRAMEWORK_CSS` is set to an unknown value
- **AND** no `css-mapping` rule matches the `generate-jsonata` step
- **THEN** the `generate-jsonata` task reports an error that no css-mapping rule was found

### Requirement: debo-css-generate uses stages architecture

The `debo-css-generate` workflow SHALL declare two stages: `execute` with steps `[css-generate:intake, generate-jsonata]` and `transform` with steps `[generate-css]`. This ensures the stage flush boundary exists between JSONata file generation and CSS transformation.

#### Scenario: Workflow plan created with font provider configured
- **WHEN** the workflow starts and `frameworks.fonts: google-fonts` is configured
- **THEN** the `generate-jsonata` step resolves to two tasks: the generic CSS generator and the font skill's generator
- **AND** both run in parallel

#### Scenario: Workflow plan created without font provider
- **WHEN** the workflow starts and `frameworks.fonts` is not set
- **THEN** the `generate-jsonata` step resolves to one task: the generic CSS generator only

#### Scenario: generate-css runs after execute stage flush
- **WHEN** all tasks in the `execute` stage complete
- **THEN** the engine flushes stashed files (renames `.debo` → final extension)
- **AND** then the `transform` stage begins with `generate-css`
- **AND** `generate-css` finds `.jsonata` files at their final target paths

### Requirement: Generic pipeline steps in generate-css task

`designbook/css-generate/tasks/generate-css.md` (no `when`) SHALL contain the generic pipeline: run all `.jsonata` files via `jsonata-w transform` and verify output files. It SHALL NOT update `app.src.css` imports directly — index file generation is handled by the separate `generate-index` task. It SHALL NOT contain font download logic.

#### Scenario: Generic task applies to all frameworks

- **WHEN** any CSS framework is configured
- **THEN** `designbook/css-generate/tasks/generate-css.md` is selected for the `generate-css` step

#### Scenario: No app.src.css manipulation in generate-css

- **WHEN** the `generate-css` task runs
- **THEN** it does NOT modify `app.src.css`
- **AND** it does NOT download fonts or manipulate Google Fonts URLs

### Requirement: Generic generate-jsonata task reads css-mapping rule
`designbook/css-generate/tasks/generate-jsonata.md` (no `when`) SHALL read the `css-mapping` rule from its resolved rules, iterate over the declared groups, and generate one JSONata template per present token group.

#### Scenario: Generate templates from mapping
- **WHEN** the css-mapping rule declares groups `color`, `layout-width`, `typography`
- **AND** `design-tokens.yml` contains all three groups
- **THEN** three `.jsonata` files are generated using the declared prefix and wrap for each group

### Requirement: delegate-framework.md step removed
The `designbook-css-generate/steps/delegate-framework.md` file and its hardcoded framework registry SHALL be removed. Framework delegation is handled entirely by stage-discovery (Rule 1).

#### Scenario: New framework added without editing orchestrator
- **WHEN** a new CSS framework skill is created with `tasks/generate-jsonata.md`
- **THEN** the framework is automatically available without modifying any existing file

