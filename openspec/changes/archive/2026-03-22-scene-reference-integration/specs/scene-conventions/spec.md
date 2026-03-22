## MODIFIED Requirements

### Requirement: Scene entry format

Scene entries in `*.scenes.yml` MAY include an optional `reference` field for design source linking. The full scene entry format is:

```yaml
scenes:
  - name: "<scene-name>"
    reference:              # optional
      type: "<stitch|image|figma>"
      url: "<resource identifier>"
      title: "<human-readable label>"
    items:
      - <entry>
```

#### Scenario: Scene with reference field
- **WHEN** a scene entry includes a `reference` field
- **THEN** the renderer SHALL ignore the `reference` field (it is metadata for testing only) and render `items` normally
