---
when:
  stages: [debo-design-tokens:dialog, debo-design-screen:dialog, debo-design-shell:dialog, create-component, create-section-scene, create-shell-scene, create-tokens]
---

# Design Guidelines Context

**Before starting this stage**, load the design guidelines:

1. Resolve path: `$DESIGNBOOK_DIST/design-system/guidelines.yml`
2. **If the file does not exist** → stop immediately and tell the user:
   > ❌ `guidelines.yml` not found. Run `/debo-design-guideline` first.
3. **If the file exists** → read it and apply its contents as constraints throughout this stage.

## How to apply the guidelines

| Key | How to use |
|-----|-----------|
| `naming.convention` | Use this convention for all component names, variants, and file names (e.g. `kebab-case`) |
| `naming.examples` | Use these as reference patterns when naming new components |
| `principles` | Apply these as quality constraints — every output must satisfy them |
| `component_patterns` | Follow these composition rules when constructing component slots and structure |
| `references` | Consult linked design systems or Figma files for visual guidance |
| `design_file` | Primary source for visual decisions; use `mcp.server` if available |
| `mcp` | If an MCP server is declared, use it to inspect the design file directly |
| `skills` | For each skill listed, call the Skill tool to load it before generating output |

All guidelines are hard constraints — apply them silently, do not repeat them to the user.
