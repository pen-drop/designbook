## MODIFIED Requirements

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
