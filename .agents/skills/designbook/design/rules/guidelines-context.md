---
when:
  stages: [design-guidelines:intake, design-component:intake, design-screen:intake, design-shell:intake, sample-data:intake, sections:intake, shape-section:intake, create-component, create-section, design-screen:create-scene, design-shell:create-scene, create-sample-data, create-guidelines]
---

# Design Guidelines Context

**Before starting this stage**, load the design guidelines:

1. Resolve path: `$DESIGNBOOK_DIST/design-system/guidelines.yml`
2. **If the file does not exist** → stop immediately and tell the user:
   > ❌ `guidelines.yml` not found. Run `/designbook design-guidelines` first.
3. **If the file exists** → read it and apply its contents as constraints throughout this stage.

## How to apply the guidelines

| Key | How to use |
|-----|-----------|
| `naming.convention` | Use this convention for all component names, variants, and file names (e.g. `kebab-case`) |
| `naming.examples` | Use these as reference patterns when naming new components |
| `principles` | Apply these as quality constraints — every output must satisfy them |
| `component_patterns` | **Binding rules** — read these BEFORE proposing or creating any component. Every pattern is a hard constraint on component structure, naming, and composition. Do not invent components that violate these patterns. If a pattern says "use container for width control", every component that needs width control MUST use container — no alternatives. |
| `references` | Consult linked design systems or Figma files for visual guidance |
| `design_file` | Primary source for visual decisions; use `mcp.server` if available |
| `mcp` | If an MCP server is declared, use it to inspect the design file directly |
| `skills` | You MUST call the Skill tool for each skill listed BEFORE producing any output or asking the user questions. This is a blocking prerequisite — do not proceed until all skills are loaded. |

All guidelines are hard constraints — apply them silently, do not repeat them to the user.
