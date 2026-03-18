---
params:
  section_id: ~        # kebab-case id from dialog
  section_title: ~     # display title
  description: ~       # 2-3 sentence description
  order: ~             # numeric position
  user_flows: []       # array of {title, steps}
  ui_requirements: []  # array of strings
  use_shell: true      # whether to wrap in app shell
files:
  - $DESIGNBOOK_DIST/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml
---

Create the directory `$DESIGNBOOK_DIST/sections/[section_id]/` and write `[section_id].section.scenes.yml`:

```yaml
id: {{ section_id }}
title: {{ section_title }}
description: {{ description }}
status: planned
order: {{ order }}

name: "Designbook/Sections/{{ section_title }}"
layout: "design-system:shell"

user_flows:
  - title: Flow title
    steps: Step 1 → Step 2 → Result

ui_requirements:
  - Requirement description

scenes: []
```

Rules:
- `id` must match the directory name (kebab-case)
- `layout: "design-system:shell"` only when `use_shell` is true; omit otherwise
- `scenes` starts as empty array — populated later by `/debo-design-screen`
- Each `user_flow.steps` is a prose description of the full path
