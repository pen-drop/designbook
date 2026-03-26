---
files: []
---

# Create Component

Generic create-component stage. The actual implementation is provided by the active component framework skill.

Framework-specific skills are loaded by convention: `designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT`

The framework skill provides its own `create-component.md` task that takes precedence over this file via `when:` conditions matching the active framework.

## Fallback Behavior

If no framework-specific skill is active, report:

> "No component framework skill is configured. Set `DESIGNBOOK_FRAMEWORK_COMPONENT` in `designbook.config.yml` and ensure the corresponding skill is loaded."
