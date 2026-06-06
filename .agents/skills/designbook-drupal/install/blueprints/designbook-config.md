---
trigger:
  steps: [write-config]
filter:
  backend: drupal
---

# Blueprint: Drupal designbook.config.yml

A starting point for the `designbook.config.yml` written into the theme root.
Substitute `__NAMESPACE__` with the resolved theme machine name.

```yaml
backend: drupal
frameworks:
  component: sdc
  css: css
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

The port in `designbook.url` must match the `-p` argument of the `storybook` script in
`package.json` (fresh installs use 6006). The verify step still derives the live URL
from the start command's `port` output — the config value is a default for later use.

The chosen CSS framework's rules may update `frameworks.css` and append to
`extensions`.
