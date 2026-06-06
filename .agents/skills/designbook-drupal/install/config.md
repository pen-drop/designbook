---
name: config
description: Write designbook.config.yml into the theme root.
---

# Config — designbook.config.yml

Write `THEME_DIR/designbook.config.yml` with exactly this content, substituting
`__CSS_FRAMEWORK__` and `__NAMESPACE__`:

```yaml
backend: drupal
frameworks:
  component: sdc
  css: __CSS_FRAMEWORK__
designbook:
  cmd: npx storybook dev
  home: .
  url: "http://localhost:6006"
dirs:
  components: components
  css:
    tokens: css/tokens
    themes: css/themes
css:
  app: css/app.src.css
component:
  namespace: '__NAMESPACE__'
  src: components
extensions:
  - id: drupal
    skill: designbook-drupal
```

When `CSS_FRAMEWORK` is `tailwind`, append to `extensions`:

```yaml
  - id: tailwind
    skill: designbook-css-tailwind
```

The file must not exist at this point — the core flow aborts in Phase 1 when it
does. Never overwrite an existing config without explicit user confirmation.
