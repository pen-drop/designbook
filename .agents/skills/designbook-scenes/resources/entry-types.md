# Scene Entry Types

## Component Entry

Reference a UI component directly with props and slot content:

```yaml
- component: test_integration_drupal:heading
  props:
    level: h1
  slots:
    text: Blog
  story: default           # Optional: load args from an existing story
```

## Entity Entry

Reference an entity from the data model. Resolved at build time:

```yaml
- entity: node.article      # "<entity_type>.<bundle>"
  view_mode: full            # Which view mode to use
  record: 0                  # Sample data record index (default: 0)
```

## Records Shorthand

> ⚠️ **Demo-only.** `records` is only valid for component demos or isolated entity previews — NOT for listing pages. Use `entity: view.*` for listing scenes instead.

```yaml
- entity: node.article
  view_mode: teaser
  records: [0, 1, 2]         # Expands to 3 separate entries
```

## View Entity

For listing pages — a JSONata file that declares its own entity refs inline:

```yaml
- entity: view.recent_articles   # entity_type: view, bundle: recent_articles
  view_mode: default              # Optional, defaults to "default"
```

No `record:` field. No `data.yml` entry needed. See `view-entity.md` for details.

## Scene Reference

Section scenes inherit the shell via `type: scene`. The `with:` key fills `$variable` placeholders in the referenced scene:

```yaml
- type: scene
  ref: "design-system:shell"      # <source>:<sceneName>
  with:                            # fills $variable placeholders in the template
    content:
      - entity: node.article
        view_mode: full
```

The resolver scans `*.scenes.yml` files in the referenced directory:

```
ref: "design-system"         → design-system/*.scenes.yml → first scene (scenes[0])
ref: "design-system:shell"   → design-system/*.scenes.yml → scene named "shell"
ref: "design-system:minimal" → design-system/*.scenes.yml → scene named "minimal"
```

Unresolved `$variable` placeholders render as a visible grey placeholder box in Storybook.
