# Design: refactor-config-frameworks

## Config Schema

```yaml
# OLD
technology: drupal
css:
  framework: daisyui

# NEW (already applied)
backend: drupal
frameworks:
  component: sdc
  css: daisyui
```

## Env Variable Mapping

| Config Key | Env Variable | Example |
|---|---|---|
| `backend` | `DESIGNBOOK_BACKEND` | `drupal` |
| `frameworks.component` | `DESIGNBOOK_FRAMEWORK_COMPONENT` | `sdc` |
| `frameworks.css` | `DESIGNBOOK_FRAMEWORK_CSS` | `daisyui` |

## Skill Rename Map

| Old Name | New Name | Reason |
|---|---|---|
| `designbook-drupal-components-ui` | `designbook-sdc-components-ui` | Component framework, not backend |
| `designbook-figma-drupal-components` | `designbook-figma-sdc-components` | Component framework, not backend |
| `designbook-figma-drupal-stories` | `designbook-figma-sdc-stories` | Component framework, not backend |
| `designbook-figma-drupal-twig` | `designbook-figma-sdc-twig` | Component framework, not backend |
| `designbook-drupal-data-model` | **stays** | Data model IS backend-specific |

## Skill Loading Convention

Skills use a convention-based naming pattern for framework selection:

```
designbook-[framework-value]-[concern]
```

| Framework Type | Config Value | Skill Pattern |
|---|---|---|
| `frameworks.component` | `sdc` | `designbook-sdc-*` |
| `frameworks.component` | `react` | `designbook-react-*` (future) |
| `frameworks.css` | `daisyui` | `designbook-css-daisyui` |
| `backend` | `drupal` | `designbook-drupal-*` (data-model only) |

## Reference Update Matrix

### Skills (env var updates)

| Skill | Old Ref | New Ref |
|---|---|---|
| `designbook-configuration` | `DESIGNBOOK_TECHNOLOGY`, `css.framework` | `DESIGNBOOK_BACKEND`, `DESIGNBOOK_FRAMEWORK_COMPONENT`, `DESIGNBOOK_FRAMEWORK_CSS` |
| `designbook-css-generate` | `DESIGNBOOK_CSS_FRAMEWORK` | `DESIGNBOOK_FRAMEWORK_CSS` |
| `designbook-css-daisyui` | `DESIGNBOOK_CSS_FRAMEWORK` | `DESIGNBOOK_FRAMEWORK_CSS` |
| `designbook-drupal-data-model` | `DESIGNBOOK_TECHNOLOGY` | `DESIGNBOOK_BACKEND` |
| `designbook-sdc-components-ui` (renamed) | `DESIGNBOOK_TECHNOLOGY` | `DESIGNBOOK_FRAMEWORK_COMPONENT` |
| `designbook-addon-skills` | `DESIGNBOOK_TECHNOLOGY` | `DESIGNBOOK_BACKEND`, `DESIGNBOOK_FRAMEWORK_COMPONENT` |

### Workflows (env var + skill name updates)

| Workflow | Old Ref | New Ref |
|---|---|---|
| `debo-design-screen` | `designbook-$DESIGNBOOK_TECHNOLOGY-components-*` | `designbook-$DESIGNBOOK_FRAMEWORK_COMPONENT-components-*` |
| `debo-design-tokens` | `DESIGNBOOK_CSS_FRAMEWORK` | `DESIGNBOOK_FRAMEWORK_CSS` |
| `debo-css-generate` | `DESIGNBOOK_CSS_FRAMEWORK` | `DESIGNBOOK_FRAMEWORK_CSS` |
| `debo-data-model` | `DESIGNBOOK_TECHNOLOGY` | `DESIGNBOOK_BACKEND` |
