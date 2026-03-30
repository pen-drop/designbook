---
when:
  steps: [design-shell:intake, design-screen:intake, design-component:intake]
  extensions: stitch
---

# Stitch Intake — Screen Selection

Enhances the core reference intake with MCP-based Stitch screen listing. When the core intake asks the user for a design reference and the design source is Stitch, this rule provides screen selection via MCP instead of manual URL entry.

## Instructions

### 1. List Available Screens

If `guidelines.yml` has `design_reference` with a `stitch://project-id/...` URL, extract the project ID and call `mcp__stitch__get_project` to verify, then `mcp__stitch__list_screens` to get available screens.

If no `design_reference` is configured, call `mcp__stitch__list_projects` first and ask the user to select a project.

### 2. Present Screens for Selection

Present the available screens to the user:

> "I found these design screens in Stitch. Which one matches this scene/component?
>
> 1. **Screen Title A** (Desktop)
> 2. **Screen Title B** (Mobile)
> 3. **Screen Title C** (Tablet)
> 4. _(skip — no reference)_"

### 3. Per-Breakpoint Mapping (Optional)

If the user wants per-breakpoint references, ask which screen maps to each breakpoint:

> "Would you like different screens per breakpoint?
>
> - **xl** (Desktop): Screen Title A
> - **sm** (Mobile): Screen Title B
> - Or use a single screen for all breakpoints?"

### 4. Store the Reference

Build the reference object:

```yaml
# Single screen:
reference:
  type: stitch
  url: stitch://project-id/screen-id
  title: "Screen Title"

# Per-breakpoint:
reference:
  type: stitch
  screens:
    xl: stitch://project-id/screen-desktop
    sm: stitch://project-id/screen-mobile
  title: "Screen Title (multi-breakpoint)"
```

For scenes: store directly in the scene's `reference` block.

For components: delegate storage to the framework skill's component-reference rule.

## Error Handling

If MCP is unavailable, skip silently — the core intake can still accept manual URL entry.
