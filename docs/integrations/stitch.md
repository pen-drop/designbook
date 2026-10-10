# Google Stitch

`designbook-stitch` resolves Stitch design references through Stitch MCP and adds screen selection to intake. It is a marketplace plugin. The skill description states it is loaded via `extensions: [stitch]`.

## Prerequisites

- `/plugin install designbook-stitch@designbook` (or skills CLI equivalent)
- Stitch MCP tools available to the agent (`mcp__stitch__get_project`, `list_screens`, `get_screen`)
- Project config:

```yaml
extensions:
  - id: stitch
```

## What it contributes

Rules under `.agents/skills/designbook-stitch/rules/`:

- `stitch-import.md` — `filter: extensions: stitch`; import intake lists Stitch screens
- `provide-stitch-url.md` — resolves `origin: stitch` to a preview URL for extract-reference and design-verify
- `stitch-reference.md` — `type: stitch` references via `mcp__stitch__get_screen`
- `stitch-tokens.md` — imports `designTheme` as token proposals during tokens intake

On `fixtures/drupal-stitch`, `intake extract-reference --palette` embeds `ctx:stitch-import` and `ctx:provide-stitch-url`. On `fixtures/drupal-petshop` (no stitch id) those keys are absent. Full procedure: [add an extension](/extend/add-an-extension).

Stitch screens can provide inspectable HTML (`hasMarkup: true`) and MCP API access (`hasAPI: true`) once the URL is resolved. Capture still goes through `extract-reference`, not a separate Stitch-only pipeline.
