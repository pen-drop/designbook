# Spec: config-frameworks

## Overview

Separate backend platform from component/CSS framework in Designbook configuration. Enable framework-specific skill loading based on `frameworks.component` and `frameworks.css`.

## Requirements

### Config Schema

```yaml
backend: drupal                    # Backend platform
frameworks:
  component: sdc                   # Component framework (sdc, react, ui_patterns)
  css: daisyui                     # CSS framework (daisyui, tailwind, vanilla)
dist: ...
```

### Environment Variables

- `DESIGNBOOK_BACKEND` — from `backend`
- `DESIGNBOOK_FRAMEWORK_COMPONENT` — from `frameworks.component`
- `DESIGNBOOK_FRAMEWORK_CSS` — from `frameworks.css`
- Old variables (`DESIGNBOOK_TECHNOLOGY`, `DESIGNBOOK_CSS_FRAMEWORK`) are removed

### Skill Naming Convention

- Backend-specific: `designbook-[backend]-*` (e.g. `designbook-drupal-data-model`)
- Component-framework-specific: `designbook-[component]-*` (e.g. `designbook-sdc-components-ui`)
- CSS-framework-specific: `designbook-css-[css]-*` (e.g. `designbook-css-daisyui`)

### Config Loader

The `designbook-configuration` skill must:
1. Read `backend`, `frameworks.component`, `frameworks.css` from config
2. Export as `DESIGNBOOK_BACKEND`, `DESIGNBOOK_FRAMEWORK_COMPONENT`, `DESIGNBOOK_FRAMEWORK_CSS`
3. Remove old mappings for `technology` and `css.framework`
