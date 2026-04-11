---
when:
  steps: [tokens:intake, design-component:intake, design-screen:intake, design-shell:intake, sample-data:intake, sections:intake, shape-section:intake, create-component, create-section, design-screen:create-scene, design-shell:create-scene, create-sample-data, capture, recapture, compare, polish]
---

# Vision Context

**Before starting this stage**, load the product vision:

1. Resolve path: `$DESIGNBOOK_DATA/vision.md`
2. **If the file does not exist** → stop immediately and tell the user:
   > ❌ `vision.md` not found. Run `/designbook vision` first.
3. **If the file exists** → read it and apply the design reference and references as context throughout this stage.

## How to apply

| Section | How to use |
|---------|-----------|
| `## Design Reference` | Primary source for visual decisions. **Before accessing it**, ask the user: "I see a design reference (`<label>`) in the vision — may I access it?" Wait for confirmation. Once confirmed, fetch it immediately (via MCP server if the extension provides one, otherwise via URL) and use it as the basis for all visual decisions. Never present suggestions without consulting the reference first. |
| `## References` | Consult linked design systems, reference files, or local folders for guidance. For folder references, scan the directory for relevant files. For URL references, fetch when needed. |

Apply context silently — do not repeat it to the user.
