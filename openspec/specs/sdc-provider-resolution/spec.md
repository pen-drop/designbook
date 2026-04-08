# SDC Provider Resolution Specification

## Purpose
Define how SDC (Single Directory Component) provider/namespace is configured and used in generated Twig templates, story files, and component definitions.

## Requirements

### Requirement: Provider configured via component.namespace
The SDC provider MUST be configured in `designbook.config.yml` under the `component.namespace` key. The config loader flattens this to `DESIGNBOOK_COMPONENT_NAMESPACE` as an environment variable.

#### Scenario: Derive namespace from config
- **WHEN** `designbook.config.yml` contains `component: { namespace: 'test_integration_drupal' }`
- **THEN** the config loader SHALL expose `DESIGNBOOK_COMPONENT_NAMESPACE=test_integration_drupal`

### Requirement: Skills use COMPONENT_NAMESPACE placeholder
Skill resource files and blueprints SHALL use `COMPONENT_NAMESPACE` as a placeholder that MUST be resolved at generation time to the actual value from the config.

#### Scenario: Provider used in generated Twig
- **WHEN** `COMPONENT_NAMESPACE` is `test_integration_drupal`
- **AND** a Twig template is generated with `include('COMPONENT_NAMESPACE:container')`
- **THEN** the output MUST contain `include('test_integration_drupal:container')`

#### Scenario: Provider used in story component references
- **WHEN** `COMPONENT_NAMESPACE` is `test_integration_drupal`
- **AND** a story YAML references `component: 'COMPONENT_NAMESPACE:card'`
- **THEN** the output MUST contain `component: 'test_integration_drupal:card'`

#### Scenario: Provider used in component.yml
- **WHEN** `COMPONENT_NAMESPACE` is `test_integration_drupal`
- **AND** a `component.yml` template has `provider: COMPONENT_NAMESPACE`
- **THEN** the generated file MUST contain `provider: test_integration_drupal`

### Requirement: COMPONENT_NAMESPACE must not appear in generated files
Generated files SHALL never contain the literal string `COMPONENT_NAMESPACE`. The sdc-conventions rule mandates resolving it to the actual config value at generation time.

#### Scenario: Literal placeholder rejected
- **WHEN** a generated Twig or YAML file is inspected
- **THEN** it MUST NOT contain the literal string `COMPONENT_NAMESPACE`
- **AND** it MUST contain the resolved value (e.g. `test_integration_drupal`)
