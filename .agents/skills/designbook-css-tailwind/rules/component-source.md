---
trigger:
  domain: components
filter:
  frameworks.css: tailwind
---

# Component Source Coverage

Ensure Tailwind scans every configured component source that emits utility
classes. Resolve source directories from the active component integration and
project configuration; template languages and file extensions belong to that
integration.

Inspect the CSS entrypoint's source configuration. Reuse coverage that already
includes the component. Add a directory-level `@source` only when existing
coverage misses it, relative to the stylesheet. Completion: utilities used by
the new or changed component appear in the compiled stylesheet.
