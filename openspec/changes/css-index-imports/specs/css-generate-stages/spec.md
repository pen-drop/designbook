## MODIFIED Requirements

### Requirement: debo-css-generate uses stages architecture

The `debo-css-generate` workflow SHALL declare steps `[generate-jsonata, generate-css]` in its frontmatter for the `generate` and `transform` stages, followed by a new `index` stage with step `[generate-index]`. Font loading is handled by font skills contributing additional tasks to the `generate-jsonata` step (via multi-task resolution), not as a separate step.

#### Scenario: Workflow plan created with font provider configured

- **WHEN** the workflow starts and `frameworks.fonts: google-fonts` is configured
- **THEN** the `generate-jsonata` step resolves to two tasks: the generic CSS generator and the font skill's generator
- **AND** both run in parallel

#### Scenario: Workflow plan created without font provider

- **WHEN** the workflow starts and `frameworks.fonts` is not set
- **THEN** the `generate-jsonata` step resolves to one task: the generic CSS generator only

#### Scenario: Index stage runs after transform

- **WHEN** the `transform` stage completes successfully
- **THEN** the `index` stage runs the `generate-index` task
- **AND** `css/tokens/index.src.css` is written before the workflow finishes

## MODIFIED Requirements

### Requirement: Generic pipeline steps in generate-css task

`designbook/css-generate/tasks/generate-css.md` (no `when`) SHALL contain the generic pipeline: run all `.jsonata` files via `jsonata-w transform` and verify output files. It SHALL NOT update `app.src.css` imports directly — index file generation is handled by the separate `generate-index` task. It SHALL NOT contain font download logic.

#### Scenario: Generic task applies to all frameworks

- **WHEN** any CSS framework is configured
- **THEN** `designbook/css-generate/tasks/generate-css.md` is selected for the `generate-css` step

#### Scenario: No app.src.css manipulation in generate-css

- **WHEN** the `generate-css` task runs
- **THEN** it does NOT modify `app.src.css`
- **AND** it does NOT download fonts or manipulate Google Fonts URLs
