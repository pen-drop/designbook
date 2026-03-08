## Why

The config key `technology: drupal` conflates the backend platform with the component framework. Drupal supports multiple component frameworks (SDC, UI Patterns, React). The new `frameworks.component` key separates these concerns, enabling framework-specific skill selection. Current skill names like `designbook-drupal-components-ui` are misleading — they implement SDC, not "Drupal components" in general.

## What Changes

- **Config keys**: `technology` → `backend` + `frameworks.component` + `frameworks.css` (already applied)
- **Env variables**: `DESIGNBOOK_TECHNOLOGY` → `DESIGNBOOK_BACKEND`, new `DESIGNBOOK_FRAMEWORK_COMPONENT`, `DESIGNBOOK_CSS_FRAMEWORK` → `DESIGNBOOK_FRAMEWORK_CSS`
- **Skill renaming**: `designbook-drupal-components-*` → `designbook-sdc-*` (component framework, not backend)
- **Skill/workflow references**: All references to old env vars and skill names updated
- **Config loader**: `designbook-configuration` skill updated to map new keys

## Capabilities

### New Capabilities
- `config-frameworks`: New config schema with `backend`, `frameworks.component`, `frameworks.css` and corresponding env variables

### Modified Capabilities
_None_

## Impact

- **Skills** (rename): `designbook-drupal-components-ui`, `designbook-figma-drupal-components`, `designbook-figma-drupal-stories`, `designbook-figma-drupal-twig`
- **Skills** (update refs): `designbook-configuration`, `designbook-css-generate`, `designbook-css-daisyui`, `designbook-drupal-data-model`, `designbook-addon-skills`
- **Workflows** (update refs): `debo-design-screen`, `debo-design-tokens`, `debo-css-generate`, `debo-data-model`
- **Config**: `designbook.config.yml` (already changed)
- **Breaking**: Old env var names no longer work
