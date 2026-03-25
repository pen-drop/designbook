## MODIFIED Requirements

### Requirement: Framework-aware skill resolution
The workflow SHALL source `designbook-configuration` (`set-env.sh`) to resolve `$DESIGNBOOK_FRAMEWORK_COMPONENT` and `$DESIGNBOOK_FRAMEWORK_CSS`. It SHALL load the component skill matching the configured framework: `designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT`. For `frameworks.component: sdc`, the resolved skill SHALL be `designbook-drupal` (sub-directory `components/`) — not the deleted `designbook-components-sdc` root.

#### Scenario: Component skill resolved from config
- **WHEN** `designbook.config.yml` has `frameworks.component: sdc`
- **THEN** the workflow SHALL load `designbook-drupal/components/` (via the `designbook-drupal` skill root)
- **AND** it SHALL NOT reference the deleted path `designbook-components-sdc/SKILL.md`

#### Scenario: CSS framework resolved by delegation
- **WHEN** the workflow delegates to `//debo-css-generate`
- **THEN** the CSS workflow SHALL resolve `$DESIGNBOOK_FRAMEWORK_CSS` internally
- **AND** the screen workflow SHALL NOT load any CSS framework skill directly
