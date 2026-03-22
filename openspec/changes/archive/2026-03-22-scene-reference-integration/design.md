## Context

Scenes in `*.scenes.yml` define what gets rendered in Storybook. Visual regression testing (`debo-test`) compares Storybook screenshots against design references (Stitch screens, Figma frames, images). Currently, the test skill requires `stitch_screen` as a manual parameter — the AI must guess or search for the matching design screen every time.

The `guidelines.yml` already declares a `design_file` and `mcp` server, but there's no connection between individual scenes and specific design screens.

## Goals / Non-Goals

**Goals:**
- Each scene can optionally declare a `reference` pointing to its design source
- `debo-design-screen` intake asks users to select a reference per scene when a design source is configured in guidelines
- `debo-test` reads the reference directly from the scene — no params needed
- Support Stitch (via MCP), image URLs, and Figma URLs as reference types

**Non-Goals:**
- Automated visual pixel-diff tooling (remains AI-based comparison via Read tool)
- Enforcing that every scene must have a reference (stays optional)
- Building new MCP integrations for Figma (just store the URL for manual comparison)

## Decisions

1. **Reference lives on the scene entry, not the section** — One section can have multiple scenes (detail, mobile, overview), each with its own design reference.

2. **Reference schema** — Minimal structure:
   ```yaml
   reference:
     type: "stitch" | "image" | "figma"
     url: "<full URL or resource ID>"
     title: "<human-readable label>"
   ```
   For Stitch: `url` is the screen resource name (e.g. `projects/xxx/screens/yyy`). The MCP server resolves it.

3. **Intake flow** — In `designbook-design-screen` intake, after scene names are confirmed:
   - Check `guidelines.yml` for `design_file` / `mcp`
   - If present, load available screens via MCP (e.g. `mcp__stitch__list_screens`)
   - Present screens to user, ask which maps to each scene
   - Store selection in scene params, written to `reference` in create-section-scene

4. **Test flow** — `debo-test` visual-diff task:
   - Read the `*.scenes.yml` for the target scene
   - If `reference` exists, resolve it by type (Stitch → MCP download, image → curl, figma → just show URL)
   - If no reference, fall back to current manual behavior

## Risks / Trade-offs

- **Stitch screen titles can change** — Storing the resource ID (`projects/xxx/screens/yyy`) in addition to title mitigates this
- **MCP dependency** — If Stitch MCP server is not available, intake skips the reference question gracefully
- **Scene YAML bloat** — Three extra lines per scene is acceptable
