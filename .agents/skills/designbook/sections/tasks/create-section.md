---
when:
  steps: [create-section]
params:
  section_id: ~        # kebab-case id from dialog
  section_title: ~     # display title
  description: ~       # 2-3 sentence description
  order: ~             # integer order within the product
files:
  - file: $DESIGNBOOK_DATA/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml
    key: section-scenes
    validators: [scene]
---

Write `[section_id].section.scenes.yml` via stdin to the CLI:
```
 write-file $WORKFLOW_NAME $TASK_ID --key section-scenes
```

**For the `sections` workflow** (intake only provides `section_id`, `section_title`, `description`, `order`):

```yaml
id: {{ section_id }}
group: "Designbook/Sections/{{ section_title }}"
title: "{{ section_title }}"
description: "{{ description }}"
status: planned
order: {{ order }}
scenes: []
```

**For the `shape-section` workflow** (also provides `user_flows`, `ui_requirements`, `use_shell`):

```yaml
id: {{ section_id }}
group: "Designbook/Sections/{{ section_title }}"
title: "{{ section_title }}"
description: "{{ description }}"
status: shaped
order: {{ order }}
scenes: []
```

Rules:
- `id` must match the directory name (kebab-case)
- Use only the fields available from the calling workflow's params
- If `user_flows` and `ui_requirements` are provided (non-empty), include them
- If `order` is not provided, omit it
- `scenes` starts as empty array — populated later by `/debo design-screen`
- **`group:`** must always be `"Designbook/Sections/{{ section_title }}"` — required in both `sections` and `shape-section` workflows
