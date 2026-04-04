---
when:
  steps: [import:intake]
  extensions: stitch
---

# Stitch Import Integration

Enhances the import intake with Stitch-specific capabilities: resolves the design reference from a Stitch project and lists available screens via MCP.

## Instructions

### 1. Resolve Stitch Project

If `design_reference.type` is `stitch`, or if the user provides a Stitch project URL:

1. Extract the project resource name from the URL
2. Call `mcp__stitch__get_project` to get project metadata
3. Use the project name as default for `product_name` if vision.md does not exist

If `mcp__stitch__get_project` fails, warn and fall back to manual input.

### 2. List Screens from Stitch

Call `mcp__stitch__list_screens` with the project resource name to retrieve all available screens.

Present the screens to the user with their names. Each screen becomes a selectable import candidate.

### 3. Build Screen References

For each selected screen, build the reference data for sub-workflow params:

```yaml
reference:
  - type: stitch
    url: "stitch://<project>/<screen-resource-name>"
    breakpoint: xl
    threshold: 3
```

The screen resource name from `list_screens` maps directly to the `url` field using the `stitch://` protocol.

### 4. Map to Sub-Workflow Params

- **design-guidelines** params: `{ "design_reference": { "type": "stitch", "url": "<project-url>" } }`
- **design-shell** params: `{ "reference": [<first screen reference>] }`
- **design-screen** params (per screen): `{ "section": "<screen-name>", "reference": [<screen reference>] }`

## Error Handling

- `mcp__stitch__get_project` fails → skip, proceed with manual product info
- `mcp__stitch__list_screens` fails → skip, ask user to list screens manually
- Individual screen fetch fails → exclude from list, warn user
