## Why

As Designbook supports multiple technology stacks, we need specialized skills to handle framework-specific logic. For Drupal, the data model needs to be mapped to Drupal's entity structure (Content Entities -> Node, Assets -> Media) and follow Drupal's field naming conventions (prefixing with `field_`). The generic `designbook-data-model` skill doesn't handle these specific requirements.

## What Changes

- Create a new skill `designbook-data-model-drupal`.
- Implement logic to check `DESIGNBOOK_TECHNOLOGY` in `designbook.config.yml`.
- If technology is `drupal`, this skill will be used for data model generation.
- Map generic Designbook data model concepts to Drupal entities:
    - Content types map to `Node` entity bundles.
    - Asset types map to `Media` entity bundles.
- Implement field naming conventions:
    - Prefix fields with `field_` (except for bundle keys/labels).
    - Ensure machine-readable names are valid for Drupal.

## Capabilities

### New Capabilities
- `designbook-data-model-drupal`: A new skill that specifically handles data model generation for Drupal projects, enforcing Drupalisms like entity mapping and field prefixing.

### Modified Capabilities
- `designbook-data-model`: Update the existing generic skill or workflow to delegate to the technology-specific skill when `DESIGNBOOK_TECHNOLOGY` is set to `drupal`. Alternatively, the workflow `/debo-data-model` will select the correct skill based on configuration.

## Impact

- **New Skill**: `designbook-data-model-drupal` added to `.agent/skills/`.
- **Workflows**: `/debo-data-model` workflow will need logic to choose between the generic skill and the Drupal-specific skill based on configuration.
- **Configuration**: Relies on `DESIGNBOOK_TECHNOLOGY` being correctly set in `designbook.config.yml`.
