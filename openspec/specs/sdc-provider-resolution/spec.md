## Capability: sdc-provider-resolution

### Scenario: Derive SDC provider from config
- Given `designbook.config.yml` has `outputs.root: "packages/integrations/test-integration-drupal"`
- When the config is loaded
- Then `$DESIGNBOOK_SDC_PROVIDER` equals `test_integration_drupal`

### Scenario: Provider used in generated Twig
- Given `$DESIGNBOOK_SDC_PROVIDER` is `test_integration_drupal`
- When a Twig template is generated with `include('[provider]:container')`
- Then the output contains `include('test_integration_drupal:container')`

### Scenario: Provider used in story component references
- Given `$DESIGNBOOK_SDC_PROVIDER` is `test_integration_drupal`
- When a story YAML references `component: '[provider]:card'`
- Then the output contains `component: 'test_integration_drupal:card'`

### Scenario: Skills document the variable
- Given `component-yml.md` references a provider
- Then it uses `$DESIGNBOOK_SDC_PROVIDER` instead of `[provider]`
