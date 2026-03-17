---
name: Delegate to Framework Skill
description: Selects and invokes the framework-specific CSS skill to generate .jsonata expression files
---

# Delegate to Framework Skill

This step selects the correct framework-specific skill based on `DESIGNBOOK_FRAMEWORK_CSS` and invokes it to generate `.jsonata` expression files.

## Prerequisites
- Step 1–2 completed
- `DESIGNBOOK_FRAMEWORK_CSS` environment variable is set

## Framework Skill Registry

| Framework  | Skill                                              |
|------------|----------------------------------------------------|
| `daisyui`  | `.agent/skills/designbook-css-daisyui/SKILL.md`    |

## Process

1. **Check framework is configured**
   - Read `DESIGNBOOK_FRAMEWORK_CSS`
   - If not set or empty:
     > "❌ No CSS framework configured. Add `frameworks.css` to `designbook.config.yml`:
     > ```yaml
     > css:
     >   framework: daisyui
     > ```
     > Supported frameworks: `daisyui`"
   - Stop here.

2. **Match to framework skill**
   - Look up `DESIGNBOOK_FRAMEWORK_CSS` in the registry table above
   - If no match:
     > "❌ Unknown CSS framework `$DESIGNBOOK_FRAMEWORK_CSS`. Supported frameworks: `daisyui`"
   - Stop here.

3. **Invoke framework skill**
   - Read and execute the matched skill's `SKILL.md`
   - The framework skill will generate `.jsonata` expression files at:
     ```
     $DESIGNBOOK_DIST/designbook-css-[framework]/*.jsonata
     ```
   - Each `.jsonata` file contains embedded `@config` with `input` and `output` paths

4. **Verify expression files were created**
   - Check that at least one `.jsonata` file exists in the expression directory
   - If none exist: report error from framework skill

## Error Handling
- Framework not configured: Show config instructions
- Unknown framework: List supported frameworks
- Framework skill fails: Show error from framework skill

## Adding New Frameworks

To support a new CSS framework:
1. Create `.agent/skills/designbook-css-[framework]/SKILL.md`
2. Add the framework to the registry table in this file
3. The new skill must generate `.jsonata` files at `$DESIGNBOOK_DIST/designbook-css-[framework]/`
