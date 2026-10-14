---
type: blueprint
name: designbook-config
trigger:
  steps: [write-config]
filter:
  backend: wordpress
---

# Blueprint: WordPress designbook.config.yml

A starting point for the `designbook.config.yml` written into the theme root. Substitute
`__NAMESPACE__` with the theme slug.

```yaml
backend: wordpress
frameworks:
  component: twig
  css: tailwind
designbook:
  cmd: npx storybook dev
  home: .
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
  - id: wordpress
    skill: designbook-wordpress
# Sync output root (the WordPress wp-content directory), relative to the workspace
# (= this config's directory unless `workspace` is set). Generated plugin and theme files
# land below it.
sync_target_dir: ../..
# Backend command strings — interpolated as {{ backend_cmd.* }} by sync and seed tasks.
backend_cmd:
  cmd: "ddev wp"
  exists_cmd: "test -e"  # append the unit's absolute output path; exit 0 = already generated
  validate_cmd: "npx storybook-addon-designbook twig check-includes"  # append unit name + file; checks component includes against <name>.schema.yml
  import: "ddev composer install -d wp-content/plugins/__NAMESPACE__-content && ddev wp plugin activate __NAMESPACE__-content && ddev wp theme activate __NAMESPACE__ && ddev wp rewrite flush"
  seed_cmd: "ddev wp eval-file"  # append the seed script path, relative to the WordPress root
  page_url_cmd: "ddev wp eval 'echo get_permalink(get_page_by_path(\"{scene}\"));'"
```

`frameworks.css` is an overridable default; the chosen CSS framework's rules may update it
and append to `extensions`.

`sync_target_dir` points at `wp-content`: generated code is a plugin
(`plugins/__NAMESPACE__-content/`) plus the theme itself (`themes/__NAMESPACE__/`). A
project whose config lives at the WordPress root uses `sync_target_dir: wp-content`.

`import` activates the generated code on the live site: Composer installs the plugin's
dependencies (Timber), then plugin and theme are activated and rewrite rules flushed.
`exists_cmd` makes re-syncs idempotent: a unit whose output file already exists is skipped.
`seed_cmd` runs a generated PHP seed script inside WordPress via WP-CLI.
